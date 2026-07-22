# CLAUDE.md — 앱인토스 미니앱 코딩 규칙

## MANDATORY: Pre-submission Checklist (run BEFORE finishing)
1. **Run `npx tsc --noEmit`** — fix ALL TypeScript errors before finishing
2. **Run `npx vitest run`** (if test file exists) — fix failing tests
3. **Verify imports** — check that all imports resolve to existing files
4. **Check for duplicates** — ensure you didn't recreate something that already exists
5. **main.tsx 수정 금지** — @AI:ANCHOR 파일. TDSMobileAITProvider/BrowserRouter가 이미 설정됨
6. **App.tsx Route 확인** — navigate()로 이동하는 모든 경로에 Route가 있는지 확인
7. **RouteState 타입 확인** — navigate state가 types.ts의 RouteState와 일치하는지 확인
8. **비주얼 골격 확인** — 모든 페이지가 ScreenScaffold/PageShell로 감싸졌는가, 1차 CTA가 SubmitFooter 또는 display="block"인가(좌측 글자폭 금지), 결과/비교는 Card로 묶였는가
9. **SDK 가드 확인** — 마운트시 SDK 호출(광고 등)·이벤트 핸들러(haptic/clipboard)가 try/catch 가드됐는가(흰 화면 방지)
10. **레이아웃 테스트 확인** — 핵심 가치 화면(결과/비교/지표/대시보드)에 레이아웃 AC가 있으면, 대응 테스트(카드 개수·전체폭 CTA·골격)가 src/__tests__에 있는가. Card/핵심 요소에 testId를 부여하고 getAllByTestId로 검증. .claude/rules/testing.md "레이아웃 검증" 참조 — 행위만 테스트하면 비주얼이 조용히 무너진다.
11. **버튼 중첩 확인** — FixedBottomCTA/BottomCTA/CTAButton은 자체가 `<button>`이다 → 안에 `<Button>`을 넣지 마라(button>button 무효 HTML). children에 라벨 직접 또는 SubmitFooter 사용. 입력 필드는 `placeholder`를 반드시 줘라(box/line variant는 빈 칸에서 라벨이 숨음). (ListRow onClick + 내부 버튼은 li>button이라 무효는 아니나 a11y상 right 슬롯 IconButton 권장.)
12. **비주얼 스모크 (UI)** — `npm run test:visual` 통과 + e2e/__shots__/*.png 를 Read로 직접 열어 자가 리뷰(.claude/rules/visual-review.md). jsdom이 못 보는 흰 화면/버튼 중첩/빈 입력칸/휑함/솔리드 알약 탭을 잡는다. (최초 1회 `npx playwright install chromium`.)
13. **(데이터/결과 화면만) 표현 풍부함** — 핵심 숫자는 CountUp 히어로(SummaryHero), 추이/비중 데이터가 있으면 Sparkline/MiniBar로 시각화, 빈 상태엔 Asset.ContentIcon. 단순 유틸리티엔 불필요 — 장식을 위한 장식 금지.

14. **카피 자가 검사 (탈-AI)** — 아래 "카피 규칙" 위반 문구가 없는지 전 페이지 훑기. 사용자가 "AI가 만든 앱" 티를 느끼는 1순위는 문구다.

If any check fails, fix it BEFORE completing. Finishing with known errors is a failure.

## 카피 규칙 — AI 냄새 금지 (토스 톤)
모든 UI 텍스트(제목·본문·버튼·에러·빈 상태·placeholder)에 적용:
- **금지 표현**: "환영합니다", "~해 보세요!"류 권유 남발, "당신(의)", "멋진/놀라운/완벽한", 번역투("~하는 것을 도와드립니다"), 기능 나열식 소개("이 앱은 ~을 제공합니다")
- **이모지**: 화면당 최대 1개(빈 상태 Asset 아이콘 제외). 리스트 항목마다 이모지 금지
- **느낌표**: 화면당 최대 1개
- **버튼**: 맥락 있는 동사 — "확인"/"제출" 대신 "계산하기"/"기록 저장"/"결과 보기"
- **에러/안내**: "오류가 발생했습니다" 금지 — 무엇이 왜 안 됐고 뭘 하면 되는지("금액을 입력해 주세요")
- **예시 데이터**: "홍길동"/"user@example.com"/"Lorem" 금지 — 실제 같은 값("월 320만 원")
- **톤**: 토스처럼 — 짧게, 능동태, 구체적 숫자. 설명이 두 문장 넘으면 줄여라

## CRITICAL: STANDALONE Vite + React app
- INDEPENDENT app, NOT monorepo. Only import from node_modules or src/
- No @ai-factory/*, drizzle-orm, @libsql/client, better-sqlite3
- No Next.js — this is a Vite + React app
- State: useState, useReducer, or localStorage
- ALWAYS check existing code before creating new files — avoid duplicates

## CRITICAL: 배포 설정 (4031 에러 방지)
- granite.config.ts의 appName은 앱인토스 콘솔에 등록된 앱 이름과 대소문자까지 완벽히 일치해야 함
- appName을 절대 임의로 변경하지 마라 — 변경 시 배포 실패 (4031 에러)
- package.json의 name 필드도 동일하게 유지
- 빌드 결과물은 토스 CDN에 호스팅됨 — 동적 SSR 불가, 정적 빌드(CSR/SSG)만 가능

## CRITICAL: vite.config.ts — external 절대 금지
- `@apps-in-toss/web-framework`를 rollupOptions.external에 추가하지 마라
- 추가하면 번들 첫 줄에 bare specifier가 남아 브라우저가 JS를 한 줄도 실행 못함 → 흰 화면
- SDK는 importmap이 아닌 window.ReactNativeWebView 글로벌로 통신하므로 번들에 포함해야 정상 동작
- rollupOptions는 빈 객체 `{}` 또는 아예 없어야 함

## CRITICAL: 토스 검수 통과 필수 규칙
- 만 19세 이상 유저만 이용 가능 — 미성년자 타겟 콘텐츠/UI 금지
- 외부 도메인 이탈(Outlink) 금지 — window.location.href, window.open으로 외부 URL 이동 금지
- 외부 링크 필요 시 토스 SDK의 네비게이션 API 사용
- 콘솔 에러(console.error) 0개 보장 — 검수 시 콘솔 에러가 있으면 반려
- CORS 에러 0개 보장 — 외부 API 호출 시 CORS 설정 필수 확인
- Android 7+, iOS 16+ 호환 — 구버전 전용 API 사용 주의

## CRITICAL: TDS 컴포넌트 API (최우선 참조)
- `.ai-factory/tds-reference.txt` — 토스 공식 TDS LLM 문서 (코딩 전 반드시 읽을 것)
- `.ai-factory/tds-essential.txt` — 실제 .d.ts에서 검증된 핵심 API 요약
- 이 두 파일이 CLAUDE.md 또는 다른 문서와 충돌하면, 이 두 파일이 우선

## CRITICAL: @apps-in-toss/web-framework SDK API (최우선 참조)
- `.ai-factory/apps-in-toss-essential.txt` — 실제 설치된 SDK의 .d.ts에서 검증된 API 목록
- SDK는 **imperative 함수**만 제공 (useTossLogin/useTossAd/useTossPayment 같은 React 훅 없음)
- React 래퍼(TossRewardAd, AdSlot)가 필요하면 `src/components/`에 직접 구현 (템플릿에 참고 구현 있음)

## CRITICAL: SDK 환각 방지 — "모르면 지어내지 말고 확인하라"
- tds-essential.txt에 없는 prop/컴포넌트 → tds-reference.txt 확인 → 없으면 존재하지 않음
- apps-in-toss-essential.txt에 없는 SDK API → 존재하지 않음 (import 에러 발생시킬 것)
- 존재하지 않는 API를 추측해서 사용하면 즉시 FAIL
- SDK로 구현 불확실 → imperative API를 래퍼 컴포넌트로 감싸서 사용

## Testing
- .claude/rules/testing.md에 테스트 규칙 + mock 패턴 있음 (반드시 참조)
- CRITICAL: TDS 컴포넌트는 jsdom에서 충돌 — testing.md의 mock 패턴 반드시 사용
- **비주얼(필수)**: e2e/visual-smoke.spec.ts(Playwright)는 jsdom이 못 보는 렌더 버그(흰 화면/버튼 중첩/빈 입력칸/휑함)를 잡는다. UI 작업 후 `npm run test:visual` 실행 + e2e/__shots__ 스크린샷을 .claude/rules/visual-review.md 루브릭으로 자가 리뷰. 최초 1회 `npx playwright install chromium`.

## 파일 구조
- src/App.tsx: 메인 앱 + React Router 라우팅
- src/pages/: 페이지 컴포넌트 — 파일명은 PascalCase, "Page" 접미사 금지 (Home.tsx ✅, HomePage.tsx ❌)
- src/components/: 재사용 컴포넌트 (TDS 래핑)
- src/hooks/: 커스텀 훅 (선택 — imperative SDK를 감싼 래퍼 등)
- src/lib/: 유틸리티, 타입, 스토리지 헬퍼
- src/__tests__/: vitest 테스트

## Routing (React Router)
```tsx
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
// 네비게이션: useNavigate() 훅 사용
// 파라미터: useParams() 훅 사용
// Link: import { Link } from 'react-router-dom'
```

## SDK는 imperative API — React 훅 없음 (.claude/rules/toss-mini-app.md 우선)
- useTossLogin/useTossAd/useTossPayment 같은 훅은 존재하지 않음 → import 시 즉시 FAIL
- 로그인: 세션 자동. 필요 시 getIsTossLoginIntegratedService()
- 광고: loadFullScreenAd/showFullScreenAd(리워드·전면), TossAds.attachBanner(배너)
- 결제: createOneTimePurchaseOrder / createSubscriptionPurchaseOrder
- 정확한 시그니처는 .ai-factory/apps-in-toss-essential.txt(실제 .d.ts)에서 확인
- React 래퍼가 필요하면 src/components/에 imperative API를 직접 감싸 구현

## Pre-built UI 컴포넌트 (이미 구현됨 — import해서 쓰고 재구현 금지)
새 페이지는 raw div로 골격을 짜지 말고 아래를 조립하라(마찰 줄이려 미리 만들어둠):
- src/components/PageShell.tsx — 페이지 SafeArea 래퍼(100dvh + safe-area + adaptive 배경)
- src/components/ScreenScaffold.tsx — 골든 골격: PageShell + 헤더(top) + 본문 + 하단 CTA(bottom) 슬롯
- src/components/BottomCTA.tsx — SubmitFooter(단일 1차 CTA, FixedBottomCTA 기반, 클릭 시 success 햅틱 자동) / ButtonStack(1·2차 CTA)
- src/components/Card.tsx — 카드 컨테이너(결과/비교/지표는 raw div 말고 Card로 묶어 위계 생성). testId prop으로 레이아웃 테스트.
- src/components/SummaryHero.tsx — 요약 히어로 카드(핵심 숫자 t1 + 카드 내 진입 버튼 + AI 라벨). 홈/결과 최상단 시각 앵커 — '휑함' 제거의 핵심.
- src/components/Amount.tsx — 금액/지표 1줄 표시(nowrap + tabular-nums + 단위 분리, 좁은 폭 줄바꿈 방지). 금액·핵심 숫자는 raw Paragraph.Text 대신 Amount.
- src/components/StateView.tsx — EmptyState(아이콘+설명+보조 weak CTA) / LoadingState(Skeleton n줄). 빈/로딩을 맨텍스트("불러오는 중")로 두지 마라.
- src/components/FloatingTabBar.tsx — 하단 탭 네비(2~5탭). 'TDS TabBar'는 존재하지 않음 — 직접 만들지 말고 이걸 써라(활성탭=컬러 틴트, 솔리드 알약/fill 버튼 금지).
- src/components/CountUp.tsx — 카운트업 히어로 숫자(0→값 애니메이션, reduced-motion 자동). 결과/대시보드의 핵심 숫자에 Amount 대신 SummaryHero value로.
- src/components/MiniBar.tsx — 진행률 바(0..1, 상환률·비중). 카드/행에 정보 밀도 추가.
- src/components/Sparkline.tsx — 추이 인라인 SVG(상환 곡선 등). D3/차트 라이브러리 금지·번들 제한 → 이걸로(의존성 0).
- src/components/AdSlot.tsx, TossRewardAd.tsx — 광고(이미 SDK 가드됨)
골든 조합(폼/결과 화면): ScreenScaffold(top=Top, bottom=SubmitFooter) 안에 본문 + Card/SummaryHero로 핵심정보 묶기.
골든 조합(탭-루트 홈, 하단 FloatingTabBar 있음): ScreenScaffold(top=Top) + SummaryHero(요약 숫자 + 카드 내 진입 버튼) + 하단 FloatingTabBar. 탭-루트엔 SubmitFooter 금지(탭바와 겹침 — 진입 액션은 카드 안에).

## CRITICAL: 버튼 전체폭 함정 (좌측 글자폭 깨짐 방지)
- TDS Button 기본 display는 'inline'(글자폭·좌측정렬). 1차/단독 CTA는 반드시 display="block" 또는 SubmitFooter/ButtonStack 사용.
- 하단 1차 액션은 손수 position:fixed 금지 → SubmitFooter(FixedBottomCTA)로.

## Data Storage (localStorage)
- src/lib/storage.ts — getItem/setItem/removeItem 헬퍼 (이미 존재)
- 복잡한 상태: useState + localStorage 동기화
- 서버가 필요하면 외부 API 서버를 fetch()로 호출

## Design Documents
- `.ai-factory/spec.md` — Full SPEC with features, ACs, data models
- `.ai-factory/prd.md` — Product Requirements Document
- `.ai-factory/task.md` — Epic/Task breakdown
- When implementing a packet, ALWAYS read `.ai-factory/spec.md` first.
- Do NOT modify any files in `.ai-factory/`.

## Code Context Tags
- `@AI:ANCHOR` — NEVER modify these lines or functions.
- `@AI:WARN` — Modify only if absolutely necessary.
- `@AI:NOTE` — Business logic with specific reasoning.

## Git Context Memory
- Recent commits contain `## Context (AI-Developer Memory)` sections
- ALWAYS respect decisions from previous packets

## Commands
- npm install (NOT pnpm)
- npx tsc --noEmit (typecheck)
- npx vitest run (tests)
- npx vite (dev server)
- npx vite build (production build)

## Shared Types (CRITICAL)
- src/lib/types.ts — 모든 도메인 타입 정의
- ALWAYS: import type { ... } from "@/lib/types"
- NEVER: 같은 타입을 다른 파일에서 재정의


## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: general(1)

Key lessons (verify against actual code before applying):
- [general] 라우팅·전역 Provider·앱 진입점 배선은 단일 패킷에서만 정의하고, 후속 패킷은 재선언 대신 기존 배선을 참조·재사용하게 하라. (60%)