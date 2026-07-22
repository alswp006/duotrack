# TASK — DuoTrack

> Ordering: 데이터 레이어 → AI API 클라이언트 → 페이지(1 페이지 1 태스크) → 통합. 각 태스크 완료 후 앱은 여전히 컴파일된다.
> AC ID 표기는 검증기 기준(`Fn-AC-N`, 전역은 `AC-Gn`)으로 통일한다.

---

## Epic 1. Data Layer

**Risk Assessment**
- Complexity: Medium
- Risk factors: (1) 싱글턴/다건 엔티티가 섞여 `id`·타임스탬프 규칙이 상이 → 저장 분기 오류. (2) `sessionsThisWeek` 단일 필드를 F1(리셋)·F3(증가)가 공유 → 이중 조작. (3) examType cascade 무효화 누락 시 뷰 집계에 잘못된 시험 기록 혼입. (4) 배열 상한 트림 미구현 시 localStorage 누적 초과.
- Mitigation: 타입(1.1) → 순수 CRUD+검증(1.2) → 리셋/증가/cascade(1.3)로 분리해 상위가 하위 계약에만 의존하도록 강제. 증가는 세션 종료 시점, 리셋은 읽기 시점으로 분리(F1-AC-3 vs F1-AC-7)하여 충돌 차단.

### Task 1.1 — TypeScript 타입 + RouteState 정의
- Description: 6개 다건 엔티티(Diagnosis, StudySession, ExamRecord, GeneratedProblemSet[+Problem]) 및 3개 싱글턴(GoalConfig, SubscriptionState, AppFlags) 인터페이스, 리터럴 유니온(examType/tier/kind), API 요청/응답 타입(DiagnoseRequest·Response, GenerateProblemsRequest·Response), 저장 결과 타입(`{ ok:true } | { ok:false, reason:'quota'|'invalid' }`), API 에러 코드 유니온(`'400'|'401'|'404'|'429'|'500'`), OPIC 등급-서수 매핑 상수, 그리고 RouteState 타입을 정의한다. 런타임 로직 없음(순수 타입 + const).
- DoD: `src/lib/types.ts`가 전 엔티티/API/결과 타입을 export하고 `tsc` 무오류 통과; `RouteState`가 `"/diagnosis/result":{diagnosisId:string}`, `"/session":{partFocus?:string}|undefined`, `"/exam/new":{kind?:'mock'|'real'}|undefined`, `"/exam/detail":{examId:string}`, `"/weak":{part?:string}|undefined`, `"/paywall":{from?:string}|undefined` 포함; `OPIC_GRADE_ORDINAL`(NL=1…AL=9) export.
- Covers: [] (전 하위 태스크의 타입 계약 원천 — 직접 검증 AC 없음)
- Files: [src/lib/types.ts]
- Depends on: none

### Task 1.2 — localStorage CRUD 헬퍼 (파싱 방어·상한 트림·quota·스키마 검증)
- Description: `duotrack:` 접두어 key 전용 타입 안전 getter/setter 구현. getter는 파싱 실패 시 기본값(goal=null, sessions=[], 기본 싱글턴) 반환. 배열 저장 함수는 상한(sessions 200 / exams 100 / problems 20) 초과 시 최오래된 항목 제거 후 저장. `setItem` QuotaExceededError는 `{ok:false,reason:'quota'}`로 롤백(크래시·console.error 없음). 스키마(필수 필드·타입·id·createdAt·updatedAt·examType별 점수 범위) 위반 시 `{ok:false,reason:'invalid'}`.
- DoD: `duotrack:goal='"{invalid"'` 저장 후 `getGoal()===null`(예외 없음); 200건 상태 세션 저장 시 길이 200 유지·최오래된 startedAt 삭제; setItem throw 목킹 시 세션 저장 `{ok:false,reason:'quota'}` 반환·console.error 0회; `saveGoal({examType:'X',targetScore:9999})` → `{ok:false,reason:'invalid'}` 미저장; 빈 스토어에서 기본값 `sessions=[]`·`goal=null` 반환.
- Covers: [F1-AC-1, F1-AC-2, F1-AC-4, F1-AC-5, F1-AC-6]
- Files: [src/lib/storage.ts]
- Depends on: Task 1.1

### Task 1.3 — 구독 상태 로직 (주간 리셋·세션 증가·examType cascade)
- Description: `getSubscription()`은 읽기 시 weekStartAt이 현재 주(월요일 기준)와 다르면 sessionsThisWeek=0 리셋 + weekStartAt 갱신 후 반환(빈 스토어는 tier:'free', sessionsThisWeek:0 기본 싱글턴). `incrementSessionsThisWeek()`는 리셋 선적용 후 +1 순수 증가(상한 강제는 호출부 F3 책임). `saveSubscription()` 제공. `saveGoal()`에 examType 변경 감지 hook 추가: 이전과 다르면 `duotrack:diagnosis`를 null 제거 + currentScore=null 초기화, exams/sessions/problems는 보존(뷰 필터는 소비 측), 원자적 저장.
- DoD: weekStartAt='2026-07-13'·오늘 2026-07-23 → `getSubscription()` 반환 sessionsThisWeek=0·weekStartAt='2026-07-20'; sessionsThisWeek=2 같은 주 → `incrementSessionsThisWeek()` 반환 3·updatedAt 갱신; goal.examType='TOEIC'+diagnosis 존재에서 `saveGoal({examType:'OPIC',...})` → `getDiagnosis()===null`·`getGoal().currentScore===null`·`getExams().length` 불변.
- Covers: [F1-AC-3, F1-AC-7, F1-AC-8]
- Files: [src/lib/subscription.ts, src/lib/storage.ts]
- Depends on: Task 1.2

---

## Epic 2. AI API Client (외부 Railway 서버)

**Risk Assessment**
- Complexity: Medium
- Risk factors: (1) 상태코드 400/401/404/429/500 + 미정의 코드(503 등) 누락 시 크래시/오표시. (2) fetch 예외를 throw로 흘리면 AC-G2(console.error 0회) 위반. (3) 엔드포인트별 404/500 메시지 상이 → 공용 매퍼가 문구 오배정.
- Mitigation: 페이지보다 먼저 클라이언트를 구현해 모든 에러를 `{ok:false,code}` 판별 유니온으로 정규화 → 페이지는 code→Toast 매핑만 담당. 미정의 코드는 500 경로로 폴백.

### Task 2.1 — diagnose / generate-problems fetch 클라이언트 + 상태코드 정규화
- Description: `VITE_AI_API_BASE` 기반 `postDiagnose(req)`·`postGenerateProblems(req)` 구현. 성공 시 `{ok:true,data}`, 실패 시 절대 throw 없이 `{ok:false,code}`(code ∈ '400'|'401'|'404'|'429'|'500') 반환. 네트워크 오류(무응답) 및 미정의 상태코드(예: 503)는 '500' 폴백. 토스 세션 컨텍스트 헤더 부착. 전 에러 경로에서 console.error 미호출(try/catch 흡수).
- DoD: 각 함수가 200 응답을 DiagnoseResponse/GenerateProblemsResponse로 파싱·반환; 목킹된 400/401/404/429/500 응답에 대응 code 반환(저장 로직 미포함); fetch reject(네트워크)·503 응답 모두 `code:'500'`; 전 경로 console.error 0회, CORS 실패 시에도 throw 없이 '500' 폴백.
- Covers: [AC-G3, AC-G10]
- Files: [src/lib/api.ts]
- Depends on: Task 1.1

---

## Epic 3. UI Pages (1 페이지 = 1 태스크)

**Risk Assessment**
- Complexity: High
- Risk factors: (1) 세션 화면 광고 실수 배치 시 핵심 가치 위반(F3-AC-2). (2) 페이지 간 location.state 불일치 → 데이터 유실. (3) TDS 여백을 Tailwind로 덮어써 검수 반려. (4) 12개 에러 AC(F2/F5) 개별 Toast 매핑 누락. (5) 예측 정확도·ROI에서 dangling FK/0분 나눗셈 → NaN/Infinity.
- Mitigation: RouteState(1.1) import해 location.state 타입 캐스팅으로 state 계약 강제. 에러 처리는 2.1의 code 유니온을 switch만 하도록 축소. F3/F5는 로직 밀도에 따라 2개 태스크 분할. 모든 골격 ScreenScaffold, 여백은 Spacing 컴포넌트만 사용.

### Task 3.1 — Onboarding 페이지 (`/onboarding`, S1)
- Description: examType(Chip/Tab), targetScore·deadline(TextField, inputMode="numeric") 폼 + SubmitFooter "시작하기". 제출 시 examType별 점수 범위·`deadline > 2026-07-23` 검증 후 saveGoal, AppFlags.onboarded=true 저장, Toast "목표가 저장되었어요", `navigate('/diagnosis')`.
- DoD: `{examType:'TOEIC',targetScore:800,deadline:'2026-11-30'}` 제출 → duotrack:goal에 id:'goal'·타임스탬프 저장·onboarded=true·`/diagnosis` 이동·Toast 표시; TOEIC에서 targetScore=1200 제출 → 미저장·TextField 하단 "10~990 사이 점수를 입력해주세요"; 골격 ScreenScaffold+SubmitFooter(display block)·인터랙티브 요소 44px 이상.
- Covers: [F2-AC-1, F2-AC-6]
- Files: [src/pages/Onboarding.tsx]
- Depends on: Task 1.3

### Task 3.2 — Diagnosis 퀴즈 페이지 (`/diagnosis`, S2)
- Description: 첫 진입 시 aiNoticeAcknowledged=false면 AlertDialog "이 서비스는 생성형 AI를 활용합니다" 1회(확인 시 flag 저장). 10문항 ListRow(4지선다). 미완료(answers.length!==10) 제출 시 API 미호출 + Toast "10문항을 모두 응답해주세요". 완료 시 postDiagnose 호출 → 대기 중 버튼 disabled + `data-testid="diagnose-loading"`. 성공 시 Diagnosis 저장(goalId·examType 스냅샷·타임스탬프)·currentScore 갱신·`navigate('/diagnosis/result',{state:{diagnosisId}})`. code별 Toast: 500/네트워크→"진단에 실패했어요. 다시 시도해주세요", 401→"세션이 만료되었어요. 앱을 다시 실행해주세요", 404→"현재 지원하지 않는 시험이에요", 400→"요청을 처리할 수 없어요. 다시 시도해주세요", 429→"요청이 많아요. 잠시 후 다시 시도해주세요"(버튼 재활성). 전 에러 경로 미저장·`/diagnosis` 유지·console.error 0회.
- DoD: 첫 진입 AlertDialog 1회·재진입 미노출; 200 응답 시 duotrack:diagnosis 저장+currentScore=640+`/diagnosis/result` 이동; 대기 중 `data-testid="diagnose-loading"`+버튼 disabled(중복 제출 불가); 7문항 제출 → API 미호출+Toast; 500/네트워크·401·404·400·429 각각 지정 Toast·미저장·머무름, 429 후 버튼 재활성.
- Covers: [F2-AC-2, F2-AC-3, F2-AC-5, F2-AC-7, F2-AC-8, F2-AC-9, F2-AC-10, F2-AC-11, F2-AC-12]
- Files: [src/pages/Diagnosis.tsx]
- Depends on: Task 1.3, Task 2.1

### Task 3.3 — Diagnosis Result 페이지 (`/diagnosis/result`, S3)
- Description: location.state.diagnosisId(RouteState 캐스팅) 또는 fallback으로 getDiagnosis() 최신값 사용. 상단 Chip "AI가 생성한 결과입니다"(`data-testid="ai-label"`), SummaryHero(예상 점수 CountUp), MiniBar(파트별 점수), SubmitFooter "학습 시작하기"→`navigate('/session')`. diagnosis 없으면 "진단 결과가 없어요" + 진단 이동 버튼.
- DoD: 결과 카드 상단에 `data-testid="ai-label"` Chip 렌더; state 없어도 최신 diagnosis fallback으로 정상 표시; "학습 시작하기" → `/session` 이동.
- Covers: [F2-AC-4]
- Files: [src/pages/DiagnosisResult.tsx]
- Depends on: Task 1.2

### Task 3.4a — Study Session 타이머·기록 (`/session`, S4 일부)
- Description: 25분 카운트다운 Card(`data-testid="timer"`, mm:ss 1초 갱신). "세션 시작"/"그만하기"(display block). 완주 시 StudySession{completed:true,elapsedSec:1500,...} 저장 + incrementSessionsThisWeek() + Toast "25분 집중 완료! 🎉"→`navigate('/')`. "그만하기"→AlertDialog "확인" 시 {completed:false,elapsedSec:경과} 저장 + increment(완주·중단 모두 1회 소진)→홈. 라우트 이탈 시 AlertDialog 이탈 확인. AdSlot/TossRewardAd/전면 광고 절대 미렌더.
- DoD: 시작 3초 후 `data-testid="timer"`="24:57"; 완주 시 완료 세션 저장+sessionsThisWeek +1+Toast+홈 이동; 12분 경과 중단 시 completed:false·elapsedSec:720 저장+increment+홈; `/session` 마운트 DOM에 `[data-testid^="ad-"]` 요소 0개.
- Covers: [F3-AC-1, F3-AC-2, F3-AC-3, F3-AC-5]
- Files: [src/pages/StudySession.tsx]
- Depends on: Task 1.3

### Task 3.4b — Study Session 게이트·빈 상태 (`/session`, S4 나머지)
- Description: 진입 시 getSubscription()(리셋 반영). 무료·sessionsThisWeek===3면 세션 미시작+increment 미호출+BottomSheet "이번 주 무료 세션 3회를 모두 사용했어요"+"프리미엄 보기"→`/paywall`. premium은 카운트 무관 정상 시작(BottomSheet 미표시). 진행 세션 없을 때 추천 파트(diagnosis.weakParts[0], 없으면 "RC") 표시, 진단 미완료 시 "먼저 실력 진단을 해보세요"+진단 이동 버튼. 세션 저장이 {ok:false,reason:'quota'}면 Toast "저장 공간이 부족해요. 오래된 기록을 정리해주세요"+increment 미호출.
- DoD: 무료 sessionsThisWeek===3 → 시작 차단+BottomSheet·increment 미호출; premium sessionsThisWeek===5 → 정상 시작·BottomSheet 미표시; 진단 없음 → 추천 파트 "RC"+진단 이동 안내; 저장 quota 실패 시 Toast+카운트 불변.
- Covers: [F3-AC-4, F3-AC-6, F3-AC-7, F3-AC-8]
- Files: [src/pages/StudySession.tsx]
- Depends on: Task 3.4a, Task 1.3

### Task 3.5 — Exam List 페이지 (`/exam`, S5)
- Description: 시험 기록 ListRow(가상 스크롤, 20건 초과 시 최대 20 DOM 노드). mock/real + "이전 시험 기록" Chip 필터. "현재" 뷰는 examType===GoalConfig.examType만, "이전" 필터에서만 불일치 레코드 노출. 0건(현재 examType 기준) 시 Asset.ContentIcon + "아직 기록한 시험 점수가 없어요" + "점수 기록하기"→`/exam/new`. 상세→`navigate('/exam/detail',{state:{examId}})`.
- DoD: 현재 examType 일치 레코드 0건 시 빈 상태 일러스트+버튼; 21건 렌더 시 DOM 노드 ≤20 유지; "현재" 뷰에서 examType 불일치 레코드 제외·"이전 시험 기록" 필터에서만 표시.
- Covers: [F4-AC-6, F4-AC-7, F4-AC-8]
- Files: [src/pages/ExamList.tsx]
- Depends on: Task 1.2

### Task 3.6 — Exam New 페이지 (`/exam/new`, S6)
- Description: kind(Tab mock/real), score·partScores(TextField inputMode="numeric"), 날짜 선택. 무료 사용자 mock 선택 시 폼 대신 BottomSheet "모의시험은 프리미엄 기능이에요"+TossPurchase 진입→`/paywall`. 저장 시 examType별 점수 범위·미래 날짜 검증. 성공 시 ExamRecord{goalId,predictedFromDiagnosisId:(현재 diagnosis id|null),타임스탬프} 저장·Toast "점수가 기록되었어요"·`navigate('/exam')`.
- DoD: `{kind:'real',score:720,takenAt:'2026-07-20',...}` 저장 → 목록 상단 추가+Toast+`/exam` 이동; 무료+mock 탭 → BottomSheet+Paywall 버튼·폼 미표시; TOEIC score=1000 → 미저장+"10~990 사이 점수를 입력해주세요"; takenAt='2026-08-01' → 미저장+"오늘 이후 날짜는 선택할 수 없어요".
- Covers: [F4-AC-1, F4-AC-3, F4-AC-4, F4-AC-5]
- Files: [src/pages/ExamNew.tsx]
- Depends on: Task 1.3

### Task 3.7 — Exam Detail 페이지 (`/exam/detail`, S7)
- Description: location.state.examId(RouteState) 없으면 `/exam` 리다이렉트. Card(점수/파트) + 예측 정확도(`data-testid="pred-accuracy"`). predictedFromDiagnosisId 참조 Diagnosis의 estimatedScore로 오차 |score-est|, 정확도 `100 - round(오차/990*100)%`. 참조가 dangling이면 "예측 데이터 없음"(NaN 금지).
- DoD: est=640·score=720 → `pred-accuracy`="92%"; 참조 diagnosis 삭제/부재 시 "예측 데이터 없음" 표시·NaN 미발생·console.error 0회; state 없이 진입 시 `/exam` 리다이렉트.
- Covers: [F4-AC-2]
- Files: [src/pages/ExamDetail.tsx]
- Depends on: Task 1.2

### Task 3.8a — Weak Parts 생성 플로우 (`/weak`, S8 일부)
- Description: partScores 최하위 취약 파트 자동 감지·강조, 생성 버튼 기본 파트 설정. Chip "AI가 생성한 결과입니다"(`data-testid="ai-label"`). diagnosis===null 시 생성 버튼 대신 "먼저 실력 진단을 완료해주세요"+진단 이동. 무료 사용자 "문제 만들기" 탭 시 BottomSheet "AI 문제 생성은 프리미엄 기능이에요"+TossPurchase→`/paywall`. 프리미엄 생성 시 postGenerateProblems 대기 중 스켈레톤+버튼 disabled(`data-testid="gen-loading"`), 성공 시 GeneratedProblemSet 저장(goalId·diagnosisId·examType 스냅샷·타임스탬프)+풀이 화면. 문항 정답 선택 시 즉시 정답/오답+해설 펼침.
- DoD: partScores={LC:70,RC:48} → "RC" 강조+기본 파트 "RC"; 생성 세트 화면에 `data-testid="ai-label"` Chip; diagnosis null → 빈 상태 안내+진단 이동; 무료 → BottomSheet+Paywall; 프리미엄 200 응답 → duotrack:problems 저장+풀이 화면, 로딩 중 `gen-loading`+버튼 disabled; 정답 선택 시 정오답+해설 표시.
- Covers: [F5-AC-1, F5-AC-2, F5-AC-3, F5-AC-4, F5-AC-6, F5-AC-7, F5-AC-8]
- Files: [src/pages/WeakParts.tsx]
- Depends on: Task 1.3, Task 2.1

### Task 3.8b — Weak Parts 에러 처리 (`/weak`, S8 나머지)
- Description: postGenerateProblems code별 Toast(미저장·머무름): 500/네트워크→"문제 생성에 실패했어요. 잠시 후 다시 시도해주세요", 401→"세션이 만료되었어요. 앱을 다시 실행해주세요", 404→"이 파트는 아직 문제를 만들 수 없어요", 400→"요청을 처리할 수 없어요. 다시 시도해주세요", 429→"요청이 많아요. 잠시 후 다시 시도해주세요"(버튼 재활성). console.error 0회.
- DoD: 500/네트워크·401·404·400·429 응답 각각 지정 Toast+미저장; 429 후 "문제 만들기" 버튼 재활성·재시도 가능; 전 에러 경로 console.error 0회.
- Covers: [F5-AC-5, F5-AC-9, F5-AC-10, F5-AC-11, F5-AC-12]
- Files: [src/pages/WeakParts.tsx]
- Depends on: Task 3.8a, Task 2.1

### Task 3.9 — ROI Report 페이지 (`/report`, S9)
- Description: 현재 examType 일치(스냅샷 비교) 완료 세션·시험만 집계. 누적 완료 분→시간, 향상분(현재→최근 실제), 효율 round(향상분/시간) SummaryHero(`data-testid="roi-hero"`)+Sparkline(`data-testid="score-trend"`)+MiniBar(`data-testid="time-bar"`). 완료 세션 0분 시 효율 "—"(Infinity/NaN·console.error 금지). 데이터 부족(완료 세션 0 또는 실제 시험 0) 시 Asset.ContentIcon+"세션을 완료하고 시험 점수를 기록하면 ROI를 계산해드려요". 집계 중 스켈레톤. 무료·reportUnlockedUntil 만료 시 본문 블러+"프리미엄 구독"(→`/paywall`)·"광고 보고 열기" 2버튼; TossRewardAd 시청 완료 시 reportUnlockedUntil=현재+24h 저장 후 본문 노출.
- DoD: 500분+640→720 → `roi-hero` 효율 "10점/시간"·3개 testid 요소 존재·ScreenScaffold+Card 위계; 완료 0분 → 효율 "—"·console.error 0회; 데이터 부족 → 빈 상태 안내; 무료 만료 → 블러+2버튼, RewardAd 완료 → reportUnlockedUntil 24h 저장+본문 표시; 집계 중 스켈레톤 후 지표 교체.
- Covers: [F6-AC-1, F6-AC-2, F6-AC-3, F6-AC-4, F6-AC-5, F6-AC-6, F6-AC-7]
- Files: [src/pages/RoiReport.tsx]
- Depends on: Task 1.3

### Task 3.10 — Home 대시보드 (`/`, S10)
- Description: 진척도 Card round((currentScore/targetScore)*100)% + ProgressBar(`data-testid="goal-progress"`). ListRow(이번 주 세션 사용량·최근 점수). 무료 미구독 시 상단 "이번 주 남은 무료 세션 N회"(N=max(0,3-sessionsThisWeek), getSubscription() 리셋 반영). 목표만 있고 진단·세션·시험 0건 시 "실력 진단으로 시작해보세요" CTA 카드→`/diagnosis`. 하단(탭바 위, 콘텐츠 비겹침)에 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />` 1개.
- DoD: currentScore=640·targetScore=800 → `data-testid="goal-progress"`=80%+ProgressBar; 무료 상태 상단에 "남은 무료 세션 N회"(N 계산 정확); 데이터 없음 시 CTA 카드→`/diagnosis`; 홈 하단 AdSlot 1개·세션/결과 화면 미배치.
- Covers: [F7-AC-1, F7-AC-4, F7-AC-5, F7-AC-6]
- Files: [src/pages/Home.tsx]
- Depends on: Task 1.3

### Task 3.11 — Paywall 페이지 (`/paywall`, S11)
- Description: 무료/프리미엄 혜택 비교 ListRow, 가격 Card, `<TossPurchase sku={import.meta.env.VITE_TOSS_IAP_SKU} processProductGrant={...} onPurchased={...} />`(로딩 중 버튼 disabled). onPurchased → processProductGrant에서 SubscriptionState{tier:'premium',activatedAt:<now>,updatedAt:<now>} 저장·Toast "프리미엄이 활성화되었어요"·`navigate(-1)`. 저장 실패(quota/invalid) 시 tier free 유지+Toast "활성화에 실패했어요. 고객센터로 문의해주세요". 결제 취소(onPurchased 미호출) 시 tier 불변+Toast "결제가 취소되었어요".
- DoD: onPurchased 콜백 → tier='premium' 저장+Toast+`navigate(-1)`; 혜택 비교 ListRow 렌더·로딩 중 결제 버튼 disabled; 저장 실패 시 tier free 유지+실패 Toast; 취소 시 tier 불변+취소 Toast.
- Covers: [F8-AC-1, F8-AC-3, F8-AC-4, F8-AC-5]
- Files: [src/pages/Paywall.tsx]
- Depends on: Task 1.3

---

## Epic 4. Integration + Landing

**Risk Assessment**
- Complexity: Medium
- Risk factors: (1) 라우트 미등록/state 타입 불일치로 페이지 간 데이터 유실. (2) 온보딩 리다이렉트 무한 루프. (3) premium 게이트 해제가 일부 화면에만 적용. (4) 전역 검수 위반(HEX 하드코딩·console.error·외부 링크·프로모션 한도) → 즉시 반려.
- Mitigation: 모든 페이지·데이터 태스크 완료 후 마지막에 라우팅·전역 정책을 일괄 배선하여 통합 시점 계약 검증. premium 해제는 각 페이지가 이미 getSubscription().tier 참조하므로 통합에서 회귀만 확인.

### Task 4.1 — 라우팅 배선 + FloatingTabBar + 온보딩 리다이렉트 + premium 게이트 회귀
- Description: react-router-dom에 11개 라우트 등록, RouteState 기준 각 페이지 location.state 캐스팅 확인. 템플릿 FloatingTabBar로 홈(`/`)·학습(`/session`)·시험(`/exam`)·리포트(`/report`) 4탭(터치 44px+). 앱 첫 진입 시 AppFlags.onboarded===false면 `/onboarding` 리다이렉트(루프 방지). tier==='premium' 시 세션 한도·모의 게이트·문제 생성 게이트·리포트 블러 전부 해제됨을 통합 확인.
- DoD: 4탭 FloatingTabBar 렌더·각 탭 이동 정상·터치 타깃 44px+; onboarded===false 최초 `/` 진입 → `/onboarding` 리다이렉트, onboarded===true 시 미리다이렉트; premium 상태 `/session` 4번째 시작 시 BottomSheet 미표시(게이트 해제 회귀 통과).
- Covers: [F7-AC-2, F7-AC-3, F8-AC-2]
- Files: [src/App.tsx, src/router.tsx]
- Depends on: Task 3.1, Task 3.2, Task 3.3, Task 3.4a, Task 3.4b, Task 3.5, Task 3.6, Task 3.7, Task 3.8a, Task 3.8b, Task 3.9, Task 3.10, Task 3.11

### Task 4.2 — 전역 검수 정책 + 프로모션 지급 + AI 고지 통합
- Description: 신규 유저 프로모션 `grantPromotionReward({promotionCode,amount})` 호출부에 amount≤5000 검증(초과 시 미호출). 전역 준수 감사: window.open/window.location.href 외부 이동 없음(AC-G1), 프로덕션 빌드 console.error 0회(AC-G2), Android7+/iOS16+ 호환(AC-G4), HEX 하드코딩 제거·var(--tds-color-*)만 사용(AC-G5), 외부 분석 SDK 미포함(AC-G6), "설치/다운로드" 유도 문구·배너 없음(AC-G7). AI 고지 통합 확인: F2/F5 첫 이용 시 생성형 AI 고지 1회+모든 AI 결과물에 "AI가 생성한 결과입니다" 배지(AC-G9).
- DoD: grantPromotionReward 호출 전 amount=6000 → 미호출·미지급, amount≤5000만 통과; 전역 grep으로 HEX 하드코딩·window.open·GA/Amplitude·"설치/다운로드" 문구 0건; 프로덕션 빌드 console.error 0회; F2/F5 AI 고지 1회+결과물 `data-testid="ai-label"` 배지 존재 재확인.
- Covers: [F8-AC-6, AC-G1, AC-G2, AC-G4, AC-G5, AC-G6, AC-G7, AC-G8, AC-G9]
- Files: [src/lib/promotion.ts, src/App.tsx]
- Depends on: Task 4.1

---

## AC Coverage

- Total ACs in SPEC: 77 (F1:8, F2:12, F3:8, F4:8, F5:12, F6:7, F7:6, F8:6, Global:10)
- Covered by tasks: 77
  - F1 (8): F1-AC-1·2·4·5·6 → 1.2 · F1-AC-3·7·8 → 1.3
  - F2 (12): F2-AC-1·6 → 3.1 · F2-AC-2·3·5·7·8·9·10·11·12 → 3.2 · F2-AC-4 → 3.3
  - F3 (8): F3-AC-1·2·3·5 → 3.4a · F3-AC-4·6·7·8 → 3.4b
  - F4 (8): F4-AC-6·7·8 → 3.5 · F4-AC-1·3·4·5 → 3.6 · F4-AC-2 → 3.7
  - F5 (12): F5-AC-1·2·3·4·6·7·8 → 3.8a · F5-AC-5·9·10·11·12 → 3.8b
  - F6 (7): F6-AC-1·2·3·4·5·6·7 → 3.9
  - F7 (6): F7-AC-1·4·5·6 → 3.10 · F7-AC-2·3 → 4.1
  - F8 (6): F8-AC-1·3·4·5 → 3.11 · F8-AC-2 → 4.1 · F8-AC-6 → 4.2
  - Global (10): AC-G3·AC-G10 → 2.1 · AC-G1·AC-G2·AC-G4·AC-G5·AC-G6·AC-G7·AC-G8·AC-G9 → 4.2
- Uncovered: 0 ✅

> 참고: Task 1.1(types.ts+RouteState)은 특정 AC를 직접 검증하지 않는 순수 타입 기반 태스크로, 전 하위 태스크의 타입 계약 원천 역할을 한다.