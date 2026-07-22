Below is the complete updated SPEC. The added error ACs are **F2 AC-11 (400), F2 AC-12 (429)** and **F5 AC-11 (400), F5 AC-12 (429)** — each with an HTTP status code, the server error string, the user-facing message, and Given/When/Then. Existing combined ACs (F2 AC-7, F5 AC-5) were narrowed to 500/network to remove overlap. The API Contract mapping and change summary are updated accordingly.

> Note on scope: per the instruction, every *added* AC carries an HTTP status code, so additions are limited to the two API-calling features (F2, F5). The non-HTTP error scenarios flagged in the coverage report are already specified and require no HTTP-status AC: localStorage quota (F1 AC-4, F3 AC-6, F8 AC-4), schema/type mismatch (F1 AC-5), corrupted-store recovery (F1 AC-1), missing-record / dangling FK (F4 AC-2, F7 fallbacks, Relationships & Cascade), weekly-limit enforcement (F3 AC-4 + F1 AC-3/AC-7), and unlock expiry (F6 AC-4). This client-side, Toss-session app has no 401/403/404/409 for local operations by architecture.

---

# SPEC — DuoTrack

영어 학습 성과 관리 앱 (앱인토스 / Vite + React + TypeScript + TDS). 광고 없는 집중 학습 + 실제 시험 점수 연동 ROI 트래킹.

---

## Common Principles

- **기술 스택**: Vite + React + TypeScript, 모든 UI는 TDS(`@toss/tds-mobile`), 라우팅은 `react-router-dom`, 영속화는 localStorage, AI 기능만 외부 API 서버(Railway) 호출.
- **인증**: 토스 앱이 세션을 자동 제공. 별도 로그인 함수 호출 없음. 사용자 식별 필요 시 `getIsTossLoginIntegratedService()`로 통합 여부만 확인.
- **광고 정책(핵심 가치)**: 학습 세션(F3) 중에는 **어떤 배너/전면 광고도 표시하지 않는다**. AdSlot 배너는 학습 흐름과 무관한 화면(홈 하단)에만 허용. 결과 언락용 `TossRewardAd`는 무료 사용자가 구독 대신 리포트를 열람하는 **대안 게이트로만** 사용하며, 세션 화면에는 절대 배치하지 않는다.
- **결제**: 템플릿 제공 `<TossPurchase sku={import.meta.env.VITE_TOSS_IAP_SKU} .../>`로 프리미엄 언락(월 7,900원 상당 1회 결제 단위). Stripe 금지.
- **AI 고지**: 진단(F2)·문제 생성(F5) 결과는 생성형 AI 산출물이므로 사전 고지 1회 + 모든 결과물에 "AI가 생성한 결과입니다" 배지 표시(전자정부/과태료 대응).
- **색상/다크모드**: HEX 하드코딩 금지. 색상은 TDS 컴포넌트 또는 `var(--tds-color-*)` CSS 변수만 사용.
- **터치 타깃**: 모든 인터랙티브 요소 최소 44px.
- **외부 이탈 금지**: `window.open`/`window.location.href`로 외부 URL 이동 금지(법률 고지·공공기관 제외). 외부 분석 SDK(GA/Amplitude) 금지.
- **화면 골격**: 모든 화면은 `ScreenScaffold`(PageShell)로 감싸고, 1차 액션은 하단 고정 `SubmitFooter` 또는 `display="block"` 버튼으로 배치. raw div 골격 금지.
- **AI 외부 서버 호출 범위**: 외부 AI 서버(Railway)는 **실력 진단(F2, `POST /diagnose`)과 취약 파트 문제 생성(F5, `POST /generate-problems`) 두 기능에만** 호출된다. 그 외 모든 기능은 로컬 집계·localStorage로만 동작한다.
- **무료/프리미엄 게이트(단일 진실 원천)**: 무료 사용자 주간 세션 한도는 **3회**이며, 이 카운트의 **증가/강제(enforcement)는 F3가**, **주간 리셋과 증가 함수 제공은 F1이** 담당한다(F1 AC-3·AC-7 ↔ F3 AC-1·AC-3·AC-4 상호 참조). 두 규칙은 동일한 `SubscriptionState.sessionsThisWeek` 필드 하나만을 조작한다.
- **출력 언어**: 한국어.

---

## Data Models

> **id/타임스탬프 규칙**: 다건 누적 엔티티(Diagnosis, StudySession, ExamRecord, GeneratedProblemSet)는 `id`(UUID)·`createdAt`·`updatedAt`을 모두 가진다. 단일 객체 싱글턴 설정(GoalConfig, SubscriptionState, AppFlags)은 localStorage key가 곧 식별자이므로 `id`를 고정 상수(`'goal'`/`'subscription'`/`'flags'`)로 두고 `updatedAt`을 유지한다(싱글턴 예외 명시). 모든 가변 레코드는 쓰기 시 `updatedAt`을 현재 시각으로 갱신한다.

### GoalConfig — 목표 시험 설정 (싱글턴)
```typescript
interface GoalConfig {
  id: 'goal';               // 싱글턴 고정 식별자(예외: localStorage key가 곧 PK)
  examType: 'TOEIC' | 'OPIC' | 'TEPS';
  targetScore: number;      // TOEIC/TEPS: 10~990, OPIC: 1~10 (등급 서수 매핑)
  currentScore: number | null; // 진단 전 null
  deadline: string;         // ISO date 'YYYY-MM-DD'
  createdAt: string;        // ISO datetime
  updatedAt: string;        // ISO datetime, 매 쓰기 시 갱신
}
// OPIC 등급-서수 매핑: NL=1, NM=2, NH=3, IL=4, IM1=5, IM2=6, IM3=7, IH=8, AL=9, (예약)=10
```
- 제약: `examType`은 3개 리터럴 중 하나. `targetScore`는 examType별 범위 검증. `deadline`은 오늘(2026-07-23) 이후.
- localStorage key: `duotrack:goal` → `GoalConfig` (단일 객체, ~200B)
- **참조 관계**: 이 엔티티는 다른 다건 엔티티의 부모(FK 대상)다. `examType` 변경 시 하위 데이터 무효화 규칙은 아래 **Relationships & Cascade** 참조.

### Diagnosis — AI 실력 진단 결과
```typescript
interface Diagnosis {
  id: string;               // crypto.randomUUID()
  goalId: 'goal';           // FK → GoalConfig.id (생성 시점 목표 스냅샷)
  examType: 'TOEIC' | 'OPIC' | 'TEPS'; // 생성 시점 examType 스냅샷(무효화 판정용)
  estimatedScore: number;
  partScores: Record<string, number>; // 예: { "LC": 62, "RC": 48 }
  weakParts: string[];      // partScores 하위 40% 파트 키
  createdAt: string;
  updatedAt: string;        // ISO datetime
  source: 'ai';
}
```
- localStorage key: `duotrack:diagnosis` → `Diagnosis` (최신 1건, ~400B)

### StudySession — 집중 학습 세션
```typescript
interface StudySession {
  id: string;
  goalId: 'goal';               // FK → GoalConfig.id
  diagnosisId: string | null;   // FK → Diagnosis.id (partFocus 추천 출처, 없으면 null)
  startedAt: string;            // ISO datetime
  endedAt: string | null;
  durationMin: number;          // 계획 시간(기본 25)
  elapsedSec: number;           // 실제 경과
  partFocus: string;            // 학습 파트 키 (예: "RC")
  examType: 'TOEIC' | 'OPIC' | 'TEPS'; // 생성 시점 스냅샷(무효화 판정용)
  completed: boolean;           // 25분 완주 여부
  createdAt: string;            // ISO datetime (= startedAt)
  updatedAt: string;            // ISO datetime, 종료/저장 시 갱신
}
```
- localStorage key: `duotrack:sessions` → `StudySession[]` (최근 200건, 건당 ~200B, ≈40KB)

### ExamRecord — 모의/실제 시험 점수
```typescript
interface ExamRecord {
  id: string;
  goalId: 'goal';                       // FK → GoalConfig.id
  predictedFromDiagnosisId: string | null; // FK → Diagnosis.id (예측 정확도 계산 출처)
  kind: 'mock' | 'real';
  examType: 'TOEIC' | 'OPIC' | 'TEPS';  // 생성 시점 스냅샷(무효화 판정용)
  score: number;
  partScores: Record<string, number>;
  takenAt: string;                      // ISO date
  predictedScore: number | null;        // 응시 직전 진단/모의 예측치
  createdAt: string;                    // ISO datetime
  updatedAt: string;                    // ISO datetime
}
```
- localStorage key: `duotrack:exams` → `ExamRecord[]` (최근 100건, 건당 ~220B, ≈22KB)

### GeneratedProblemSet — AI 생성 문제 세트
```typescript
interface Problem {
  id: string;
  question: string;
  options: string[];        // 4지선다
  answerIndex: number;      // 0~3
  explanation: string;
}
interface GeneratedProblemSet {
  id: string;
  goalId: 'goal';           // FK → GoalConfig.id
  diagnosisId: string | null; // FK → Diagnosis.id (취약 파트 감지 출처)
  part: string;             // 취약 파트 키
  examType: 'TOEIC' | 'OPIC' | 'TEPS'; // 생성 시점 스냅샷(무효화 판정용)
  problems: Problem[];      // 5문항 고정
  createdAt: string;
  updatedAt: string;        // ISO datetime
  source: 'ai';
}
```
- localStorage key: `duotrack:problems` → `GeneratedProblemSet[]` (최근 20세트, 세트당 ~2.5KB, ≈50KB)

### SubscriptionState — 구독/무료 사용량 (싱글턴)
```typescript
interface SubscriptionState {
  id: 'subscription';       // 싱글턴 고정 식별자(예외)
  tier: 'free' | 'premium';
  activatedAt: string | null;
  weekStartAt: string;      // 주간 카운트 기준 월요일 ISO date
  sessionsThisWeek: number; // 무료: 최대 3 (증가=F3, 리셋=F1)
  reportUnlockedUntil: string | null; // 보상형 광고로 언락한 리포트 만료 시각
  updatedAt: string;        // ISO datetime, 매 쓰기 시 갱신
}
```
- localStorage key: `duotrack:subscription` → `SubscriptionState` (~220B)

### AppFlags — 앱 상태 플래그 (싱글턴)
```typescript
interface AppFlags {
  id: 'flags';              // 싱글턴 고정 식별자(예외)
  onboarded: boolean;
  aiNoticeAcknowledged: boolean;
  updatedAt: string;        // ISO datetime, 매 쓰기 시 갱신
}
```
- localStorage key: `duotrack:flags` → `AppFlags` (~100B)

**총 용량 추정**: 모든 모델 합산 ≈ 115KB (< 5MB, 안전).

---

### Relationships & Cascade — FK 관계 및 무효화 규칙

- **관계도**:
  - `GoalConfig(1)` ──< `Diagnosis(N)` (`Diagnosis.goalId`)
  - `GoalConfig(1)` ──< `StudySession(N)` (`StudySession.goalId`), `Diagnosis(1)` ──< `StudySession(N)` (`StudySession.diagnosisId`)
  - `GoalConfig(1)` ──< `ExamRecord(N)` (`ExamRecord.goalId`), `Diagnosis(1)` ──< `ExamRecord(N)` (`ExamRecord.predictedFromDiagnosisId`)
  - `GoalConfig(1)` ──< `GeneratedProblemSet(N)` (`GeneratedProblemSet.goalId`), `Diagnosis(1)` ──< `GeneratedProblemSet(N)` (`GeneratedProblemSet.diagnosisId`)
- **스냅샷 원칙**: 각 하위 엔티티는 생성 시점의 `examType`을 자체 필드로 스냅샷 보관한다. "현재 유효(current)" 여부는 항상 **`레코드.examType === GoalConfig.examType`** 비교로 판정한다.
- **examType 변경 시 무효화(cascade/invalidation)** — F1이 `saveGoal()`에서 examType 변경을 감지하면 다음을 원자적으로 수행한다:
  1. **Diagnosis**: `duotrack:diagnosis`가 이전 examType이면 `null`로 제거(현재 진단 무효). `GoalConfig.currentScore`도 `null`로 초기화.
  2. **ExamRecord / StudySession / GeneratedProblemSet**: **물리 삭제하지 않고 보존**하되, examType이 다른 레코드는 "현재 시험 대상이 아님"으로 간주하여 모든 "현재/이번 주/ROI" 집계 뷰에서 **제외**한다(과거 기록 열람은 별도 "이전 시험 기록" 필터로만 허용).
  3. **SubscriptionState.sessionsThisWeek**: 변경하지 않는다(주간 한도는 시험 종류와 무관, F1 AC-3 리셋 규칙만 적용).
- **참조 무결성**: `diagnosisId`/`predictedFromDiagnosisId`가 가리키는 Diagnosis가 삭제/교체되어 dangling이면, 소비 측(F4 예측 정확도·F6 ROI)은 해당 참조를 `null`로 취급하고 계산에서 제외한다(크래시 금지).

---

## Feature List

### F1. 데이터 레이어 & localStorage 스토어

- **Description**: 위 6개 데이터 모델(+싱글턴 3종)의 읽기/쓰기/마이그레이션을 담당하는 순수 로직 레이어. 각 key에 대한 타입 안전 getter/setter, 용량 초과 방어, 주간 사용량 리셋 로직, examType 변경 시 cascade 무효화, 세션 카운트 증가 함수를 제공한다. UI 없음 — 모든 상위 기능이 이 레이어를 통해서만 localStorage에 접근한다.
- **Data**: GoalConfig, Diagnosis, StudySession, ExamRecord, GeneratedProblemSet, SubscriptionState, AppFlags 전체.
- **API**: 없음.
- **Requirements**:
  - AC-1 [U][P0]: The system shall `duotrack:` 접두어 key로만 localStorage에 접근하며, 각 getter는 파싱 실패 시 해당 모델의 기본값을 반환한다.
    - Scenario: 손상 데이터 복구 / Given `duotrack:goal`에 `"{invalid"` 저장 / When `getGoal()` 호출 / Then 예외 없이 `null` 반환.
  - AC-2 [E][P0]: When 세션·시험·문제 저장 함수가 호출되면, the system shall 배열 상한(sessions 200, exams 100, problems 20)을 초과하는 가장 오래된 항목을 제거한 뒤 저장한다.
    - Scenario: 상한 트림 / Given `duotrack:sessions`에 200건 존재 / When 신규 세션 저장 / Then 길이가 200 유지되고 가장 오래된 `startedAt` 항목이 삭제됨.
  - AC-3 [S][P0]: While `SubscriptionState.weekStartAt`이 현재 주(월요일 기준)와 다른 동안, the system shall `sessionsThisWeek`를 0으로 리셋하고 `weekStartAt`을 갱신한 후 값을 반환한다. **본 리셋은 F3의 증가/강제 로직(F3 AC-1·AC-4)과 동일한 `sessionsThisWeek` 필드를 조작하며, 리셋은 읽기(`getSubscription()`) 시점에, 증가는 세션 종료(F3 AC-7 호출) 시점에만 발생하여 서로 충돌하지 않는다.**
    - Scenario: 주간 리셋 / Given weekStartAt='2026-07-13', 오늘 2026-07-23 / When `getSubscription()` 호출 / Then sessionsThisWeek=0, weekStartAt='2026-07-20'.
  - AC-4 [W][P1]: If `localStorage.setItem`이 `QuotaExceededError`를 던지면, the system shall 저장을 롤백하고 `{ ok: false, reason: 'quota' }`를 반환하며 앱을 크래시시키지 않는다.
    - Scenario: 용량 초과 / Given setItem이 QuotaExceededError throw / When 세션 저장 / Then 반환값 `{ ok:false, reason:'quota' }`, console.error 없음.
  - AC-5 [W][P1]: If 저장하려는 값이 스키마(필수 필드/타입, `id`/`createdAt`/`updatedAt` 포함)를 만족하지 않으면, the system shall 저장하지 않고 `{ ok: false, reason: 'invalid' }`를 반환한다.
    - Scenario: 스키마 위반 / When `saveGoal({ examType:'X', targetScore:9999 })` / Then 저장 안 됨, 반환 `{ ok:false, reason:'invalid' }`.
  - AC-6 [U][P1]: The system shall 최초 호출 시(빈 스토어) 각 모델의 빈 상태(`goal=null`, `sessions=[]`, `subscription={id:'subscription', tier:'free', sessionsThisWeek:0,...}`)를 반환한다.
    - Scenario: 콜드 스타트 / Given localStorage 비어있음 / When `getSubscription()` / Then `tier='free'`, `sessionsThisWeek=0`.
  - AC-7 [E][P0]: When F3가 `incrementSessionsThisWeek()`를 호출하면, the system shall 먼저 AC-3 주간 리셋을 적용한 뒤 `sessionsThisWeek`를 1 증가시켜 저장하고 갱신된 값을 반환하되, **증가 결과가 무료 티어(`tier==='free'`) 기준 3을 초과하지 않도록 F3의 사전 게이트(F3 AC-4)와 함께 동작한다**(이 함수 자체는 프리미엄 무제한을 위해 상한을 강제하지 않고 순수 증가만 수행, 상한 판단은 호출부 F3 책임).
    - Scenario: 카운트 증가 / Given `sessionsThisWeek=2`, 같은 주 / When `incrementSessionsThisWeek()` / Then 반환 3, `updatedAt` 갱신.
  - AC-8 [E][P1]: When `saveGoal()`이 기존 `examType`과 다른 값으로 호출되면, the system shall **Relationships & Cascade** 규칙에 따라 `duotrack:diagnosis`를 `null`로 제거하고 `currentScore`를 `null`로 초기화한 뒤 저장한다(ExamRecord/StudySession/GeneratedProblemSet은 보존하되 스냅샷 examType으로 뷰 필터링).
    - Scenario: 시험 종류 전환 / Given goal.examType='TOEIC', diagnosis 존재 / When `saveGoal({examType:'OPIC', ...})` / Then `getDiagnosis()===null`, `getGoal().currentScore===null`, 기존 exams 배열 길이 불변.

---

### F2. 목표 설정 & AI 실력 진단

- **Description**: 사용자가 목표 시험·목표 점수·마감일을 설정하고, 10문항 진단 퀴즈에 응답하면 외부 AI 서버가 예상 점수·파트별 점수·취약 파트를 산출한다. 결과는 `duotrack:diagnosis`에 저장되고 학습 경로/ROI 계산의 기준점이 된다.
- **Data**: GoalConfig, Diagnosis, AppFlags.
- **API**: `POST /diagnose { examType, answers } → { estimatedScore, partScores, weakParts }` | errors 400/401/404/429/500.
- **Requirements**:
  - AC-1 [E][P0]: Scenario: 목표 설정 저장 성공
    Given 온보딩 화면에서
    When `{ examType:'TOEIC', targetScore:800, deadline:'2026-11-30' }` 제출
    Then `duotrack:goal`에 `id:'goal'`·`createdAt`·`updatedAt` 포함 저장되고 `AppFlags.onboarded=true`, `/diagnosis`로 이동, TDS Toast "목표가 저장되었어요" 표시.
  - AC-2 [E][P0]: Scenario: AI 서비스 첫 이용 고지
    Given 사용자가 진단(AI 기능)을 처음 시작할 때(`aiNoticeAcknowledged=false`)
    When `/diagnosis` 진입
    Then TDS AlertDialog에 "이 서비스는 생성형 AI를 활용합니다" 안내가 1회 표시됨
    And 확인 버튼 탭 시 `AppFlags.aiNoticeAcknowledged=true` 저장, 다이얼로그가 다시 표시되지 않음.
  - AC-3 [E][P0]: Scenario: AI 진단 성공
    Given 10문항 모두 응답 완료(`answers.length===10`)
    When "진단 결과 보기" 탭 → `POST /diagnose` 200 응답 `{ estimatedScore:640, partScores:{LC:70,RC:58}, weakParts:['RC'] }`
    Then `duotrack:diagnosis`에 `goalId:'goal'`·`examType`(스냅샷)·`createdAt`·`updatedAt` 포함 저장, `GoalConfig.currentScore=640` 갱신, `/diagnosis/result`로 이동.
  - AC-4 [U][P0]: Scenario: AI 결과물 라벨 표시
    Given 진단 결과가 `/diagnosis/result`에 표시될 때
    Then 결과 카드 상단에 TDS Chip "AI가 생성한 결과입니다" 배지가 표시됨(`data-testid="ai-label"`).
  - AC-5 [S][P1]: While `/diagnose` 응답 대기 중, the system shall 제출 버튼을 비활성화하고 TDS 로딩 인디케이터를 표시한다.
    Scenario: 진단 로딩 / When 요청 진행 중 / Then 버튼 disabled, `data-testid="diagnose-loading"` 표시, 중복 제출 불가.
  - AC-6 [W][P1]: Scenario: 목표 점수 범위 위반
    Given TOEIC 선택 상태
    When `targetScore=1200` 제출
    Then 저장 안 되고 TDS TextField 하단 에러 "10~990 사이 점수를 입력해주세요" 표시.
  - AC-7 [W][P1]: Scenario: AI 서버 오류(500/네트워크)
    Given 진단 응답 대기 중
    When `POST /diagnose`가 **HTTP 500 `{ error: "diagnosis failed" }`** 또는 네트워크 오류(무응답) 반환
    Then TDS Toast "진단에 실패했어요. 다시 시도해주세요" 표시, `/diagnosis`에 머무름, 저장 안 됨.
  - AC-8 [W][P1]: Scenario: 미완료 응답 제출 차단(클라이언트 사전 차단, 서버 400 방어)
    Given 10문항 중 7문항만 응답(`answers.length!==10`)
    When "진단 결과 보기" 탭
    Then API 호출 없이 TDS Toast "10문항을 모두 응답해주세요" 표시(서버 400 `{ error: "answers must contain exactly 10 items" }` 사전 차단).
  - AC-9 [W][P1]: Scenario: 세션/인증 실패(401)
    Given 진단 요청 시 토스 세션이 만료·무효
    When `POST /diagnose`가 **HTTP 401 `{ error: "unauthorized" }`** 반환
    Then TDS Toast "세션이 만료되었어요. 앱을 다시 실행해주세요" 표시, 저장 안 됨, `/diagnosis`에 머무름.
  - AC-10 [W][P2]: Scenario: 미지원 시험 종류(404)
    Given 서버가 해당 examType 진단 리소스를 제공하지 않음
    When `POST /diagnose`가 **HTTP 404 `{ error: "exam type not supported" }`** 반환
    Then TDS Toast "현재 지원하지 않는 시험이에요" 표시, 저장 안 됨, `/diagnosis`에 머무름.
  - **AC-11 [W][P2]: Scenario: 잘못된 요청(400)**
    **Given** 클라이언트 사전 검증을 통과했으나 서버가 요청 본문을 거부(예: `answers` 원소 범위 위반 등)
    **When** `POST /diagnose`가 **HTTP 400 `{ error: "answers must contain exactly 10 items" }`** 반환
    **Then** TDS Toast "요청을 처리할 수 없어요. 다시 시도해주세요" 표시, 저장 안 됨, `/diagnosis`에 머무름, `console.error` 미출력.
  - **AC-12 [W][P2]: Scenario: 요청 한도 초과(429)**
    **Given** 진단 요청 대기 중
    **When** `POST /diagnose`가 **HTTP 429 `{ error: "rate limit exceeded" }`** 반환
    **Then** TDS Toast "요청이 많아요. 잠시 후 다시 시도해주세요" 표시, 저장 안 됨, `/diagnosis`에 머무르며 제출 버튼은 재활성화되어 재시도 가능.

---

### F3. 광고 없는 집중 학습 세션 (25분 포모도로)

- **Description**: 25분 카운트다운 타이머 기반 집중 세션. 세션 진행 중에는 어떤 광고·중간 알림도 노출하지 않는다(핵심 가치). 완주 또는 중단 시 `StudySession`으로 기록되며, 무료 사용자는 주 3회로 제한된다. **주간 카운트 증가는 본 기능이 F1의 `incrementSessionsThisWeek()`(F1 AC-7)를 호출해 수행하고, 리셋은 F1 AC-3가 담당한다 — 두 규칙은 동일 필드를 조작하며 상충하지 않는다.**
- **Data**: StudySession, SubscriptionState, Diagnosis(partFocus 추천용).
- **API**: 없음.
- **Requirements**:
  - AC-1 [E][P0]: Scenario: 세션 시작 및 기록
    Given `sessionsThisWeek < 3`(무료) 또는 premium
    When "세션 시작" 탭 후 25분 카운트다운 종료
    Then `StudySession{ goalId:'goal', diagnosisId, examType(스냅샷), durationMin:25, completed:true, elapsedSec:1500, createdAt, updatedAt }` 저장, F1 `incrementSessionsThisWeek()`로 `sessionsThisWeek` +1, TDS Toast "25분 집중 완료! 🎉" 표시.
  - AC-2 [U][P0]: The system shall 세션 화면(`/session`) 내에 AdSlot·TossRewardAd·전면 광고를 **어떤 상태에서도 렌더링하지 않는다**.
    Scenario: 세션 광고 부재 / Given `/session` 마운트 / Then DOM에 `[data-testid^="ad-"]` 요소가 0개.
  - AC-3 [E][P1]: Scenario: 세션 중도 종료
    Given 세션이 12분 경과(elapsedSec=720)
    When "그만하기" 탭 → AlertDialog "확인"
    Then `StudySession{ completed:false, elapsedSec:720, updatedAt 갱신 }` 저장, F1 `incrementSessionsThisWeek()`로 `sessionsThisWeek` +1(완주·중단 모두 1회 소진), 홈으로 이동.
  - AC-4 [W][P0]: Scenario: 무료 주간 한도 초과 (enforcement)
    Given 무료 사용자, `getSubscription()`(F1 AC-3 리셋 반영 후) `sessionsThisWeek===3`
    When "세션 시작" 탭
    Then 세션이 시작되지 않고 `incrementSessionsThisWeek()`도 호출되지 않으며 TDS BottomSheet로 "이번 주 무료 세션 3회를 모두 사용했어요" + "프리미엄 보기" 버튼 표시.
  - AC-5 [S][P1]: While 세션이 진행 중, the system shall 남은 시간을 `mm:ss`로 1초 간격 갱신 표시하고, 화면 이탈(라우트 변경) 시 AlertDialog로 이탈 확인을 요구한다.
    Scenario: 타이머 표시 / Given 세션 시작 3초 후 / Then `data-testid="timer"` 텍스트가 "24:57".
  - AC-6 [W][P1]: If 세션 저장이 F1에서 `{ ok:false, reason:'quota' }`로 실패하면, the system shall TDS Toast "저장 공간이 부족해요. 오래된 기록을 정리해주세요" 표시하고 카운트는 증가시키지 않는다(저장 실패 시 `incrementSessionsThisWeek()` 미호출).
  - AC-7 [U][P1]: The system shall 진행 중 세션이 없을 때(빈 상태) `/session` 진입 화면에 추천 파트(진단 `weakParts[0]`, 없으면 "RC")를 표시하고, 진단 미완료 시 "먼저 실력 진단을 해보세요" 안내 + 진단 이동 버튼을 표시한다.
  - AC-8 [U][P0]: Scenario: 프리미엄 무제한 (게이트 해제)
    Given `tier==='premium'`, `sessionsThisWeek===5`
    When "세션 시작" 탭
    Then AC-4 BottomSheet 미표시, 세션 정상 시작(프리미엄은 F1 AC-7 순수 증가만 적용, 상한 미검사).

---

### F4. 모의/실제 시험 점수 기록 & 예측 정확도

- **Description**: 모의시험 결과와 실제 시험 점수를 입력·목록화하고, 진단/모의 예측치 대비 실제 점수의 예측 정확도를 계산해 표시한다. 모의시험 기록은 프리미엄 기능이다.
- **Data**: ExamRecord, Diagnosis, SubscriptionState, GoalConfig.
- **API**: 없음.
- **Requirements**:
  - AC-1 [E][P0]: Scenario: 실제 점수 기록 성공
    Given 시험 기록 폼에서
    When `{ kind:'real', examType:'TOEIC', score:720, partScores:{LC:390,RC:330}, takenAt:'2026-07-20' }` 제출
    Then `duotrack:exams`에 `goalId:'goal'`·`predictedFromDiagnosisId`(현재 진단 id 또는 null)·`createdAt`·`updatedAt` 포함 저장, 목록 상단에 추가, TDS Toast "점수가 기록되었어요" 표시.
  - AC-2 [E][P0]: Scenario: 예측 정확도 계산
    Given 직전 진단 `estimatedScore=640`(레코드의 `predictedFromDiagnosisId`로 참조), 실제 `score=720` 기록
    When 상세 화면 진입
    Then 예측 오차 `|720-640|=80`, 정확도 `100 - round(80/990*100)=92%`로 표시(`data-testid="pred-accuracy"`). 참조 진단이 dangling(examType 변경으로 삭제)이면 "예측 데이터 없음" 표시(NaN 금지).
  - AC-3 [W][P0]: Scenario: 모의시험 프리미엄 게이트
    Given 무료 사용자
    When "모의시험 기록" 탭
    Then 기록 폼 대신 TDS BottomSheet "모의시험은 프리미엄 기능이에요" + TossPurchase 진입 버튼 표시.
  - AC-4 [W][P1]: Scenario: 점수 범위 위반
    Given examType='TOEIC'
    When `score=1000` 제출
    Then 저장 안 됨, TextField 에러 "10~990 사이 점수를 입력해주세요" 표시.
  - AC-5 [W][P1]: Scenario: 미래 날짜 거부
    Given 오늘 2026-07-23
    When `takenAt='2026-08-01'` 제출
    Then 저장 안 됨, 에러 "오늘 이후 날짜는 선택할 수 없어요" 표시.
  - AC-6 [U][P1]: The system shall 기록이 0건일 때(현재 goal.examType과 일치하는 레코드 기준) 목록 화면에 `Asset.ContentIcon` 빈 상태 일러스트와 "아직 기록한 시험 점수가 없어요" + "점수 기록하기" 버튼을 표시한다.
  - AC-7 [S][P1]: While 목록이 20건을 초과하는 동안, the system shall 리스트를 가상 스크롤(윈도잉)로 렌더링하여 한 번에 최대 20개 DOM 노드만 유지한다.
  - AC-8 [U][P1]: The system shall 목록의 "현재" 뷰에서 `examType !== GoalConfig.examType`인 레코드를 제외하고(Relationships & Cascade), "이전 시험 기록" 필터에서만 노출한다.

---

### F5. 취약 파트 감지 & AI 문제 자동 생성

- **Description**: 진단·시험 기록의 파트 점수를 분석해 최하위 취약 파트를 감지하고, 외부 AI 서버에서 해당 파트 5문항을 생성해 풀이·정답·해설을 제공한다. AI 생성 결과물임을 명시한다. 문제 생성은 프리미엄 기능이다.
- **Data**: GeneratedProblemSet, Diagnosis, ExamRecord, SubscriptionState.
- **API**: `POST /generate-problems { examType, part, count } → { problems }` | errors 400/401/404/429/500.
- **Requirements**:
  - AC-1 [E][P0]: Scenario: 취약 파트 문제 생성 성공
    Given 진단 `weakParts=['RC']`, 프리미엄 사용자
    When "RC 집중 문제 만들기" 탭 → `POST /generate-problems { examType:'TOEIC', part:'RC', count:5 }` 200 응답(problems 5건)
    Then `duotrack:problems`에 `goalId:'goal'`·`diagnosisId`·`examType`(스냅샷)·`createdAt`·`updatedAt` 포함 저장, 문제 풀이 화면 표시.
  - AC-2 [U][P0]: Scenario: AI 결과물 라벨 표시
    Given 생성된 문제 세트가 화면에 표시될 때
    Then 화면 상단에 TDS Chip "AI가 생성한 결과입니다" 배지 표시(`data-testid="ai-label"`).
  - AC-3 [E][P0]: Scenario: 취약 파트 자동 감지
    Given `partScores={LC:70, RC:48}` (RC가 하위)
    When 취약 파트 화면 진입
    Then 취약 파트로 "RC"가 강조 표시되고 생성 버튼 기본 파트가 "RC"로 설정됨.
  - AC-4 [S][P1]: While `/generate-problems` 응답 대기 중, the system shall TDS 스켈레톤/로딩을 표시하고 "문제 만들기" 버튼을 비활성화한다(`data-testid="gen-loading"`).
  - AC-5 [W][P1]: Scenario: 생성 실패(500/네트워크)
    Given 요청 대기 중
    When `POST /generate-problems`가 **HTTP 500 `{ error: "generation failed" }`** 또는 네트워크 오류(무응답) 반환
    Then TDS Toast "문제 생성에 실패했어요. 잠시 후 다시 시도해주세요" 표시, 저장 안 됨.
  - AC-6 [W][P1]: Scenario: 진단 미완료 시 차단
    Given `duotrack:diagnosis===null`
    When 취약 파트 화면 진입
    Then 문제 생성 버튼 대신 "먼저 실력 진단을 완료해주세요" 안내 + 진단 이동 버튼 표시(빈 상태).
  - AC-7 [W][P1]: Scenario: 무료 사용자 게이트
    Given 무료 사용자
    When "문제 만들기" 탭
    Then TDS BottomSheet "AI 문제 생성은 프리미엄 기능이에요" + TossPurchase 진입 버튼 표시.
  - AC-8 [E][P2]: When 사용자가 문제 정답을 선택하면, the system shall 즉시 정답/오답 여부와 해설을 펼쳐 표시한다.
  - AC-9 [W][P1]: Scenario: 세션/인증 실패(401)
    Given 문제 생성 요청 시 토스 세션이 만료·무효
    When `POST /generate-problems`가 **HTTP 401 `{ error: "unauthorized" }`** 반환
    Then TDS Toast "세션이 만료되었어요. 앱을 다시 실행해주세요" 표시, 저장 안 됨.
  - AC-10 [W][P2]: Scenario: 미지원 파트/시험(404)
    Given 서버가 해당 examType·part 조합을 제공하지 않음
    When `POST /generate-problems`가 **HTTP 404 `{ error: "part not available" }`** 반환
    Then TDS Toast "이 파트는 아직 문제를 만들 수 없어요" 표시, 저장 안 됨.
  - **AC-11 [W][P2]: Scenario: 잘못된 요청(400)**
    **Given** `part` 또는 `count` 값이 서버 검증을 통과하지 못함
    **When** `POST /generate-problems`가 **HTTP 400 `{ error: "invalid part or count" }`** 반환
    **Then** TDS Toast "요청을 처리할 수 없어요. 다시 시도해주세요" 표시, 저장 안 됨, `console.error` 미출력.
  - **AC-12 [W][P2]: Scenario: 요청 한도 초과(429)**
    **Given** 문제 생성 요청 대기 중
    **When** `POST /generate-problems`가 **HTTP 429 `{ error: "rate limit exceeded" }`** 반환
    **Then** TDS Toast "요청이 많아요. 잠시 후 다시 시도해주세요" 표시, 저장 안 됨, "문제 만들기" 버튼은 재활성화되어 재시도 가능.

---

### F6. 학습 ROI 리포트 (시간당 점수 향상 효율)

- **Description**: 누적 학습 시간과 점수 향상분을 결합해 "시간당 점수 향상 효율"을 계산하고, 추이 스파크라인·요약 히어로 지표로 시각화한다. 프리미엄 전용이나, 무료 사용자는 보상형 광고 시청으로 1회(24시간) 열람할 수 있다. **집계 대상은 현재 `GoalConfig.examType`과 일치하는(스냅샷 비교) StudySession·ExamRecord만 포함한다(Relationships & Cascade).**
- **Data**: StudySession, ExamRecord, Diagnosis, SubscriptionState, GoalConfig.
- **API**: 없음(로컬 집계).
- **Requirements**:
  - AC-1 [U][P0]: Scenario: ROI 계산
    Given 현재 examType의 누적 완료 세션 총 500분(8.33h), 진단 640 → 최근 실제 720
    When 리포트 화면 진입
    Then 향상분 80점, 효율 `round(80 / 8.33) = 10점/시간`으로 SummaryHero(CountUp)에 표시(`data-testid="roi-hero"`).
  - AC-2 [U][P0]: Scenario: 결과 화면 레이아웃 계약
    Given 리포트 화면(`/report`)
    Then ScreenScaffold로 감싸이고, 핵심 지표는 Card로 묶이며, `data-testid="roi-hero"`(효율)·`data-testid="score-trend"`(Sparkline 추이)·`data-testid="time-bar"`(MiniBar 파트별 시간 비중) 3개 요소를 포함한다.
  - AC-3 [E][P0]: Scenario: 무료 사용자 보상형 광고 언락
    Given 무료 사용자, `reportUnlockedUntil` 만료
    When "광고 보고 리포트 열기" 탭 → `TossRewardAd` 광고 시청 완료
    Then `reportUnlockedUntil = 현재+24h` 저장(`updatedAt` 갱신), ROI 리포트 내용이 표시됨.
  - AC-4 [S][P0]: While 무료 사용자이고 `reportUnlockedUntil`이 만료된 동안, the system shall 리포트 본문을 블러 처리하고 "프리미엄 구독" 및 "광고 보고 열기" 두 버튼을 표시한다.
  - AC-5 [U][P1]: The system shall 데이터가 부족할 때(현재 examType 기준 완료 세션 0건 또는 실제 시험 0건) 리포트 대신 `Asset.ContentIcon` 빈 상태와 "세션을 완료하고 시험 점수를 기록하면 ROI를 계산해드려요" 안내를 표시한다.
  - AC-6 [W][P1]: Scenario: 0시간 나눗셈 방어
    Given 완료 세션 총 0분
    When ROI 계산
    Then `Infinity`/`NaN` 대신 효율을 "—"로 표시하고 콘솔 에러가 발생하지 않는다.
  - AC-7 [S][P1]: While 세션·시험 데이터를 집계하는 동안, the system shall TDS 스켈레톤을 표시하고 집계 완료 후 실제 지표로 교체한다.

---

### F7. 홈 대시보드 & 하단 탭 네비게이션

- **Description**: 목표 진척도, 이번 주 세션 사용량, 최근 점수를 한눈에 보여주는 홈. 템플릿 제공 `FloatingTabBar`로 홈/학습/시험/리포트를 전환한다. 학습 흐름과 무관한 홈 하단에만 AdSlot 배너를 배치한다.
- **Data**: GoalConfig, Diagnosis, StudySession, ExamRecord, SubscriptionState.
- **API**: 없음.
- **Requirements**:
  - AC-1 [U][P0]: Scenario: 진척도 표시
    Given `currentScore=640, targetScore=800`
    When 홈 진입
    Then 진척도 `round((640/800)*100)=80%`가 TDS ProgressBar와 함께 표시됨(`data-testid="goal-progress"`).
  - AC-2 [U][P0]: The system shall 하단 `FloatingTabBar`로 홈(`/`)·학습(`/session`)·시험(`/exam`)·리포트(`/report`) 4개 탭을 제공하며 각 탭 터치 타깃은 44px 이상이다.
  - AC-3 [E][P1]: Scenario: 온보딩 미완료 리다이렉트
    Given `AppFlags.onboarded===false`
    When 앱 첫 진입(`/`)
    Then `/onboarding`으로 리다이렉트됨.
  - AC-4 [U][P1]: The system shall 홈 하단(콘텐츠와 겹치지 않는 위치, 탭바 위)에만 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`를 1개 배치하고, 세션/결과 화면에는 배치하지 않는다.
  - AC-5 [U][P1]: The system shall 데이터가 없을 때(목표만 있고 진단·세션·시험 0건) 홈에 "실력 진단으로 시작해보세요" CTA 카드를 빈 상태로 표시한다.
  - AC-6 [S][P1]: While 프리미엄 미구독 상태, the system shall 홈 상단에 "이번 주 남은 무료 세션 N회"를 표시한다(N = 3 - sessionsThisWeek, 음수는 0; `getSubscription()` 호출로 F1 AC-3 리셋 반영).

---

### F8. 프리미엄 구독(IAP) & 게이트 관리

- **Description**: 무료/프리미엄 티어 상태를 관리하고, 템플릿 `TossPurchase`로 프리미엄 언락을 처리한다. 결제 성공 시 `SubscriptionState.tier='premium'`으로 전환해 세션 무제한·모의시험·문제 생성·ROI 리포트를 개방한다.
- **Data**: SubscriptionState.
- **API**: 없음(IAP는 TossPurchase 컴포넌트가 처리).
- **Requirements**:
  - AC-1 [E][P0]: Scenario: 프리미엄 결제 성공
    Given 무료 사용자, 페이월 화면
    When `<TossPurchase sku={import.meta.env.VITE_TOSS_IAP_SKU} .../>`의 `onPurchased` 콜백 호출
    Then `processProductGrant`에서 `SubscriptionState{ tier:'premium', activatedAt:<now>, updatedAt:<now> }` 저장, TDS Toast "프리미엄이 활성화되었어요" 표시, 이전 화면으로 복귀.
  - AC-2 [U][P0]: While `tier==='premium'`, the system shall 세션 주간 한도·모의시험 게이트·문제 생성 게이트·리포트 블러를 모두 해제한다.
    Scenario: 게이트 해제 / Given premium / When `/session` 4번째 시작 / Then 정상 시작(BottomSheet 미표시).
  - AC-3 [W][P1]: Scenario: 결제 취소
    Given 결제 진행 중
    When 사용자가 결제를 취소(`onPurchased` 미호출)
    Then tier 변경 없음, TDS Toast "결제가 취소되었어요" 표시.
  - AC-4 [W][P1]: If `processProductGrant`에서 저장이 실패하면(F1 quota/invalid), the system shall tier를 free로 유지하고 TDS Toast "활성화에 실패했어요. 고객센터로 문의해주세요" 표시.
  - AC-5 [U][P1]: The system shall 페이월 화면에서 무료/프리미엄 혜택 비교를 TDS ListRow 목록으로 표시하고, 로딩 중에는 결제 버튼을 disabled 처리한다.
  - AC-6 [W][P0]: If `grantPromotionReward`를 호출하는 신규 유저 프로모션 지급 시, the system shall `amount ≤ 5000`을 검증하고 초과 시 호출하지 않는다.
    Scenario: 프로모션 한도 / Given 프로모션 지급 로직 / When `amount=6000` / Then `grantPromotionReward` 미호출, 지급 안 됨.

---

## Screen Definitions

### S1. Onboarding — `/onboarding`
- **TDS 컴포넌트**: ScreenScaffold, Top(타이틀), TDS Tab 또는 Chip(examType 선택 TOEIC/OPIC/TEPS), TDS TextField(targetScore, deadline), SubmitFooter(하단 고정 Button "시작하기").
- **상태**: 로딩 없음. 에러 = TextField 인라인 에러("10~990 사이 점수를 입력해주세요", "오늘 이후 날짜를 선택해주세요"). 빈 상태 = 초기 폼.
- **터치**: Chip/버튼 44px 이상. TextField 포커스 시 모바일 숫자 키패드(`inputMode="numeric"`), 키보드가 SubmitFooter를 가리지 않도록 스크롤.
- **Navigation 계약**:
  - Outgoing: 시작하기 → `navigate('/diagnosis')` (state 없음).
  - Incoming: `location.state` 없음.
- **Layout 계약**: ScreenScaffold 골격, 1차 액션은 SubmitFooter(display block). 좌측 글자폭 버튼 금지.

### S2. Diagnosis — `/diagnosis`
- **TDS 컴포넌트**: ScreenScaffold, AlertDialog(AI 사전 고지), TDS ListRow(10문항, 각 4지선다 Chip/Radio), TDS ProgressBar(응답 진척), SubmitFooter(Button "진단 결과 보기"), 로딩 인디케이터.
- **상태**: 로딩 = `data-testid="diagnose-loading"` + 버튼 disabled. 에러 = Toast("진단에 실패했어요. 다시 시도해주세요"/"세션이 만료되었어요. 앱을 다시 실행해주세요"/"현재 지원하지 않는 시험이에요"/"요청을 처리할 수 없어요. 다시 시도해주세요"/"요청이 많아요. 잠시 후 다시 시도해주세요"). 빈 = 미응답 문항 강조.
- **터치**: 선택지 44px 이상.
- **Navigation 계약**:
  - Outgoing: 결과 → `navigate('/diagnosis/result', { state: { diagnosisId: string } })`.
  - Incoming: `location.state` 없음.

### S3. Diagnosis Result — `/diagnosis/result`
- **TDS 컴포넌트**: ScreenScaffold, TDS Chip("AI가 생성한 결과입니다", `data-testid="ai-label"`), Card(예상 점수/파트 점수), SummaryHero(예상 점수 CountUp), MiniBar(파트별 점수), SubmitFooter(Button "학습 시작하기").
- **상태**: 로딩 = 스켈레톤. 에러 = diagnosis 없으면 "진단 결과가 없어요" + 진단 이동 버튼. 빈 = 동일.
- **Navigation 계약**:
  - Outgoing: 학습 시작 → `navigate('/session')`.
  - Incoming: `location.state = { diagnosisId: string }` — 없으면 `duotrack:diagnosis` 최신값 사용(fallback).
- **Layout 계약**: `data-testid="ai-label"` Chip + Card 위계 + SummaryHero 히어로 지표 포함.

### S4. Study Session — `/session`
- **TDS 컴포넌트**: ScreenScaffold, Card(타이머 `data-testid="timer"`), TDS Button("세션 시작"/"그만하기", display block), AlertDialog(중단/이탈 확인), BottomSheet(무료 한도 초과), TDS Toast(완료). **AdSlot/TossRewardAd 렌더링 금지.**
- **상태**: 진행 = 카운트다운. 빈 = 추천 파트 안내 또는 "먼저 실력 진단을 해보세요". 에러 = quota Toast.
- **터치**: 시작/그만하기 버튼 44px 이상.
- **Navigation 계약**:
  - Outgoing: 완료/중단 → `navigate('/')`; 진단 유도 → `navigate('/diagnosis')`; 프리미엄 → `navigate('/paywall')`.
  - Incoming: `location.state = { partFocus?: string } | undefined`.
- **Layout 계약**: 타이머는 Card 내부 강조 타이포(t2~t3). `data-testid^="ad-"` 요소 0개(AC-F3-2).

### S5. Exam List — `/exam`
- **TDS 컴포넌트**: ScreenScaffold, Top, TDS ListRow(시험 기록, 가상 스크롤), TDS Chip(mock/real 필터 + "이전 시험 기록" 필터), SubmitFooter(Button "점수 기록하기"), Asset.ContentIcon(빈 상태).
- **상태**: 로딩 = 스켈레톤. 빈 = "아직 기록한 시험 점수가 없어요". 에러 = Toast.
- **Navigation 계약**:
  - Outgoing: 기록 → `navigate('/exam/new')`; 상세 → `navigate('/exam/detail', { state: { examId: string } })`.
  - Incoming: `location.state` 없음.

### S6. Exam New — `/exam/new`
- **TDS 컴포넌트**: ScreenScaffold, TDS Tab(kind mock/real), TDS TextField(score, partScores, `inputMode="numeric"`), 날짜 선택(TDS 컴포넌트), BottomSheet(모의 프리미엄 게이트), SubmitFooter(Button "저장").
- **상태**: 에러 = 인라인("10~990 사이 점수를 입력해주세요", "오늘 이후 날짜는 선택할 수 없어요"). 빈 = 초기 폼.
- **키보드**: 숫자 키패드, SubmitFooter 가림 방지 스크롤.
- **Navigation 계약**:
  - Outgoing: 저장 성공 → `navigate('/exam')`; 모의 게이트 → `navigate('/paywall')`.
  - Incoming: `location.state = { kind?: 'mock' | 'real' } | undefined`.

### S7. Exam Detail — `/exam/detail`
- **TDS 컴포넌트**: ScreenScaffold, Card(점수/파트), 예측 정확도 지표(`data-testid="pred-accuracy"`), SummaryHero.
- **상태**: 참조 진단 dangling 시 "예측 데이터 없음" 표시(NaN 금지).
- **Navigation 계약**:
  - Incoming: `location.state = { examId: string }` — 없으면 `/exam`으로 리다이렉트.
  - Outgoing: 뒤로 → `navigate(-1)`.

### S8. Weak Parts / AI Problems — `/weak`
- **TDS 컴포넌트**: ScreenScaffold, Card(취약 파트 강조), TDS Chip("AI가 생성한 결과입니다"), TDS Button("문제 만들기"), 스켈레톤(`data-testid="gen-loading"`), TDS ListRow(문항/선택지), BottomSheet(무료 게이트), Toast(생성 실패).
- **상태**: 로딩 = 스켈레톤. 빈 = "먼저 실력 진단을 완료해주세요". 에러 = Toast("문제 생성에 실패했어요. 잠시 후 다시 시도해주세요"/"세션이 만료되었어요. 앱을 다시 실행해주세요"/"이 파트는 아직 문제를 만들 수 없어요"/"요청을 처리할 수 없어요. 다시 시도해주세요"/"요청이 많아요. 잠시 후 다시 시도해주세요").
- **Navigation 계약**:
  - Outgoing: 진단 유도 → `navigate('/diagnosis')`; 프리미엄 → `navigate('/paywall')`.
  - Incoming: `location.state = { part?: string } | undefined`.

### S9. ROI Report — `/report`
- **TDS 컴포넌트**: ScreenScaffold, Card(핵심 지표), SummaryHero(효율 CountUp, `data-testid="roi-hero"`), Sparkline(점수 추이 `data-testid="score-trend"`), MiniBar(파트별 시간 `data-testid="time-bar"`), TossRewardAd(무료 언락), TDS Button("프리미엄 구독"/"광고 보고 열기"), Asset.ContentIcon(빈 상태).
- **상태**: 로딩 = 스켈레톤. 빈 = "세션을 완료하고 시험 점수를 기록하면 ROI를 계산해드려요". 잠금 = 본문 블러 + 2버튼.
- **Navigation 계약**:
  - Outgoing: 프리미엄 → `navigate('/paywall')`.
  - Incoming: `location.state` 없음.
- **Layout 계약**: ScreenScaffold + Card 위계 + `roi-hero`/`score-trend`/`time-bar` 3요소(AC-F6-2).

### S10. Home — `/`
- **TDS 컴포넌트**: ScreenScaffold, Card(진척도 `data-testid="goal-progress"` + ProgressBar), TDS ListRow(이번 주 세션 사용량, 최근 점수), FloatingTabBar(하단 4탭), AdSlot(하단, 탭바 위), Asset.ContentIcon(빈 상태).
- **상태**: 로딩 = 스켈레톤. 빈 = "실력 진단으로 시작해보세요" CTA. 에러 = 없음.
- **Navigation 계약**:
  - Outgoing: 탭 → `/session` `/exam` `/report`; CTA → `/diagnosis`; 온보딩 미완료 → `navigate('/onboarding')`.
  - Incoming: `location.state` 없음.
- **Layout 계약**: 진척도 Card + ProgressBar, AdSlot은 콘텐츠와 비겹침.

### S11. Paywall — `/paywall`
- **TDS 컴포넌트**: ScreenScaffold, Top, TDS ListRow(무료/프리미엄 혜택 비교), Card(가격), `<TossPurchase sku={import.meta.env.VITE_TOSS_IAP_SKU} processProductGrant={...} onPurchased={...} />`, Toast.
- **상태**: 로딩 = 결제 버튼 disabled. 에러 = Toast("결제가 취소되었어요"/"활성화에 실패했어요").
- **Navigation 계약**:
  - Outgoing: 결제 성공 → `navigate(-1)`.
  - Incoming: `location.state = { from?: string } | undefined`.

---

## API Contract (외부 AI 서버 — Railway 별도 배포)

Base URL은 `import.meta.env.VITE_AI_API_BASE`. 모든 응답은 CORS 허용(앱인토스 도메인). 에러는 통일 형태 `{ error: string }`. **인증**: 토스 세션 컨텍스트를 헤더로 전달하며, 세션 무효 시 서버는 401을 반환한다. **호출 대상은 `/diagnose`(F2)와 `/generate-problems`(F5) 두 엔드포인트뿐이다.**

### POST /diagnose
```typescript
// Request
interface DiagnoseRequest {
  examType: 'TOEIC' | 'OPIC' | 'TEPS';
  answers: number[]; // length 10, 각 원소 0~3 (선택 인덱스)
}
// Response 200
interface DiagnoseResponse {
  estimatedScore: number;             // examType 범위 내
  partScores: Record<string, number>; // 예: { "LC": 70, "RC": 58 }
  weakParts: string[];                // partScores 하위 파트 키
}
// Errors
// 400 { error: "answers must contain exactly 10 items" }   // 잘못된 요청 → F2 AC-8(사전 차단) + F2 AC-11(서버 응답 처리)
// 401 { error: "unauthorized" }                            // 세션/인증 실패 → F2 AC-9
// 404 { error: "exam type not supported" }                 // 미지원 examType → F2 AC-10
// 429 { error: "rate limit exceeded" }                     // 요청 한도 초과 → F2 AC-12
// 500 { error: "diagnosis failed" }                        // 서버 오류 → F2 AC-7
```

### POST /generate-problems
```typescript
// Request
interface GenerateProblemsRequest {
  examType: 'TOEIC' | 'OPIC' | 'TEPS';
  part: string;   // 취약 파트 키 (예: "RC")
  count: number;  // 고정 5
}
// Response 200
interface GenerateProblemsResponse {
  problems: {
    id: string;
    question: string;
    options: string[];   // length 4
    answerIndex: number; // 0~3
    explanation: string;
  }[];
}
// Errors
// 400 { error: "invalid part or count" }        // 잘못된 요청 → F5 AC-11
// 401 { error: "unauthorized" }                 // 세션/인증 실패 → F5 AC-9
// 404 { error: "part not available" }           // 미지원 examType·part 조합 → F5 AC-10
// 429 { error: "rate limit exceeded" }          // 요청 한도 초과 → F5 AC-12
// 500 { error: "generation failed" }            // 서버 오류 → F5 AC-5
```

---

## Toss 검수 통과 ACs (전역 적용)

- AC-G1 [W][P0]: If 코드가 `window.open`/`window.location.href`로 외부 URL 이동을 시도하면, the system shall 해당 이동을 수행하지 않는다(법률 고지·공공기관 링크 예외 없음 — 본 앱은 외부 링크 미사용).
- AC-G2 [U][P0]: The system shall 프로덕션 빌드에서 `console.error`를 0회 출력한다(모든 API 에러 응답 400/401/404/429/500은 Toast로 처리하며 throw/console.error 미발생).
- AC-G3 [U][P0]: The system shall 외부 API 호출 시 CORS 오류를 0회 발생시킨다(서버에서 앱인토스 origin 허용).
- AC-G4 [U][P1]: The system shall Android 7+/iOS 16+에서 동작하며 최신 전용 API를 사용하지 않는다.
- AC-G5 [W][P0]: The system shall 색상에 HEX 하드코딩(`#FFFFFF` 등)을 사용하지 않고 TDS 컴포넌트/`var(--tds-color-*)`만 사용하여 다크모드를 지원한다.
- AC-G6 [W][P0]: The system shall 외부 분석 SDK(GA/Amplitude 등)를 포함하지 않는다.
- AC-G7 [W][P1]: The system shall "앱을 설치하세요"/"다운로드" 등 외부 앱 설치 유도 문구·배너·링크를 포함하지 않는다.
- AC-G8 [U][P0]: Scenario: 프로모션 지급 한도 / When `grantPromotionReward({ promotionCode, amount })` 호출 / Then `amount ≤ 5000`을 검증하고 초과 시 호출하지 않는다.
- AC-G9 [U][P0]: The system shall AI 기능(F2 진단, F5 문제 생성) 첫 이용 시 "이 서비스는 생성형 AI를 활용합니다" 고지를 1회 표시하고 모든 AI 결과물에 "AI가 생성한 결과입니다" 배지를 표시한다.
- **AC-G10 [W][P0]: The system shall 모든 외부 API 응답(`/diagnose`, `/generate-problems`)에 대해 HTTP 상태코드별로 정의된 사용자 메시지(400·429="요청/요청이 많아요…", 401="세션이 만료되었어요…", 404=엔드포인트별 미지원 안내, 500=엔드포인트별 실패 안내)를 표시하고, 어떤 상태코드에서도 저장을 수행하지 않으며 앱을 크래시시키지 않는다.**
    Scenario: 미정의 상태코드 폴백 / Given 서버가 위 목록 외 상태코드(예: 503)를 반환 / When 응답 수신 / Then 해당 엔드포인트의 500 처리 경로(F2 AC-7 / F5 AC-5 메시지)로 폴백하여 Toast 표시, 저장 안 됨, `console.error` 미출력.

---

## Assumptions

1. 외부 AI 서버(Railway)는 별도 배포되며 앱인토스 origin에 대해 CORS를 허용한다. MVP 기간 응답 지연은 평균 3초 이내로 가정한다.
2. OPIC 등급은 데이터 모델의 서수 매핑(NL=1…AL=9)으로 수치화하여 ROI/진척도 계산에 사용한다.
3. Toss IAP는 월 구독을 "1회 결제 언락" 단위로 취급하며, 갱신/자동결제 관리는 앱인토스 콘솔·플랫폼 정책에 위임한다(앱 내 갱신 스케줄러 없음).
4. 무료 티어 주간 카운트는 월요일 00:00(로컬) 기준으로 리셋한다.
5. 진단 문항(10개 고정)과 정답 채점은 AI 서버가 담당하며, 앱은 answers 배열만 전송한다.
6. 학습 세션 타이머는 앱이 포그라운드인 동안만 정확히 카운트한다(백그라운드 정밀 타이머는 MVP 범위 밖).
7. 싱글턴 설정(GoalConfig/SubscriptionState/AppFlags)은 localStorage key가 곧 기본 키이므로 별도 UUID 없이 고정 `id` 상수를 사용한다(id/타임스탬프 규칙 예외).
8. examType 변경 시 하위 다건 기록은 물리 삭제하지 않고 스냅샷 examType으로 뷰 필터링만 수행한다(과거 데이터 보존 우선).
9. **API 에러 처리는 상태코드 기준으로 분기하며, 정의되지 않은 상태코드는 해당 엔드포인트의 500 경로로 폴백한다(AC-G10). 400 응답은 클라이언트 사전 검증(F2 AC-8)을 통과한 이후에도 서버가 요청을 거부한 방어적 케이스로 간주한다.**

## Open Questions

1. OPIC의 목표/현재 점수를 서수 매핑으로 다룰 때 사용자에게 등급 라벨(IH/AL)로 표시할지, ROI 계산은 서수로만 할지 UX 확정 필요.
2. 프리미엄 결제가 "월 구독"인데 Toss IAP one-time purchase로 처리 시 만료/갱신 판단 기준(플랫폼 영수증 vs 로컬 activatedAt)을 콘솔 정책과 확정해야 함.
3. 무료 사용자 ROI 리포트 보상형 광고 언락(24시간)이 "광고 없는 학습" 핵심 가치와 상충하지 않는지 — 리포트는 학습 흐름 밖이라 허용으로 설계했으나 최종 확인 필요.
4. 신규 유저 프로모션(`grantPromotionReward`) 실제 집행 여부·promotionCode 발급 여부(콘솔) 미확정 — 미집행 시 F8 AC-6는 방어 로직만 유지.
5. 진단/문제 생성 AI 호출 비용 관리를 위한 무료 사용자 호출 제한(예: 진단 무료 1회) 필요 여부.
6. examType 변경 시 하위 기록을 "보존 후 필터링"으로 설계했으나, 사용자가 과거 시험 기록을 명시적으로 삭제할 수 있는 UI(하드 삭제)를 제공할지 확정 필요.
7. **429(rate limit) 응답에 `Retry-After` 헤더를 포함할지, 포함 시 클라이언트가 자동 재시도 백오프를 적용할지 여부 미확정(현재 AC-F2-12/F5-12는 수동 재시도만 정의).**

---

**변경 요약(이번 개정)**: 누락된 HTTP 상태코드 기반 에러 AC를 추가·정비했다.
- **F2**: `AC-11`(HTTP 400 `"answers must contain exactly 10 items"` → Toast "요청을 처리할 수 없어요. 다시 시도해주세요"), `AC-12`(HTTP 429 `"rate limit exceeded"` → Toast "요청이 많아요. 잠시 후 다시 시도해주세요") 신설. 기존 `AC-7`은 500/네트워크 전용으로 좁히고 상태코드·서버 에러 문자열을 명시. `AC-9`(401)/`AC-10`(404)에 HTTP 상태코드·서버 문자열 명시 보강.
- **F5**: `AC-11`(HTTP 400 `"invalid part or count"`), `AC-12`(HTTP 429 `"rate limit exceeded"`) 신설. 기존 `AC-5`는 500/네트워크 전용으로 좁히고 상태코드 명시(429는 AC-12로 분리). `AC-9`(401)/`AC-10`(404) 문자열 보강.
- **전역**: `AC-G10` 신설 — 모든 API 응답의 상태코드별 메시지 계약과 미정의 상태코드의 500 폴백 규정. `AC-G2`에 API 에러의 console.error 미발생 명시.
- **API Contract**: `/diagnose`·`/generate-problems` 에러 주석을 각 대응 AC(F2 AC-7~12, F5 AC-5~12)로 재매핑. Assumptions 9, Open Question 7(`Retry-After`) 추가. 스크린 정의(S2/S8) 에러 상태에 신규 Toast 문구 반영.
- **비HTTP 시나리오**(localStorage quota, 스키마/타입 위반, 손상 복구, 누락/dangling 레코드, 주간 한도 enforcement, 언락 만료)는 기존 AC(F1 AC-1/4/5, F3 AC-4/6, F4 AC-2, F6 AC-4 등)로 이미 커버되어 HTTP 상태코드 AC 추가 대상이 아니며, 본 앱은 클라이언트·Toss 세션 구조상 로컬 연산에 401/403/404/409가 존재하지 않음.