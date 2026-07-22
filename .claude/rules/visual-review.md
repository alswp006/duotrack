# 비주얼 셀프 리뷰 (UI 작업 끝내기 전 필수)

`npm run test:visual` 통과 후, `e2e/__shots__/*.png`를 **직접 열어(Read)** 아래를 눈으로 확인하라.
유닛 테스트(jsdom)는 렌더를 못 본다 — 텍스트/동작이 다 초록불이어도 "정렬은 맞지만 휑한/깨진" 화면이 통과한다.
이 자가 리뷰가 그걸 잡는 마지막 관문이다.

## 체크리스트 (하나라도 걸리면 고치고 재캡처)

- [ ] **빈 입력칸 없음** — 입력 화면의 칸이 빈 회색 박스가 아니라 placeholder가 보이는가 (box/line variant는 빈 칸에서 라벨이 숨는다 → placeholder 필수)
- [ ] **탭 활성표시** — 하단 탭의 선택 탭이 솔리드 파란 알약이 **아니라** 아이콘+라벨 컬러 틴트인가 (FloatingTabBar 사용)
- [ ] **1차 CTA 전체폭** — 주요 버튼이 좌측 글자폭/화면 중앙 부유가 아니라 전체폭인가 (SubmitFooter 또는 display="block")
- [ ] **시각 앵커** — 홈/결과 최상단에 핵심 숫자 하나가 크게 박혀 있는가 (SummaryHero/Amount) — 화면이 휑하지 않은가
- [ ] **빈/로딩 상태** — 맨텍스트("불러오는 중", "데이터 없음")가 아니라 EmptyState/Skeleton(StateView)인가
- [ ] **버튼 중첩 없음** — `<button>` 안에 `<button>`이 없는가 (CTA류 안에 Button 금지 — test:visual이 자동 검출하지만 눈으로도 확인)
- [ ] **기본 건전성** — 흰 화면/콘텐츠 잘림/요소 겹침이 없고, 다크 모드에서도 텍스트가 보이는가

## (데이터/결과 화면만) 풍부함 체크 — 조건부

데이터·결과·대시보드 화면이면 추가로 확인(단순 유틸리티/설정 화면엔 불필요 — 장식 강요 금지):

- [ ] **숫자 앵커** — 핵심 숫자가 CountUp 히어로(SummaryHero)로 크게 들어갔는가
- [ ] **데이터 시각화** — 추이/비중 데이터가 있으면 Sparkline/MiniBar로 표현했는가(맨 숫자 나열 아님)
- [ ] **빈 상태 아이콘** — 빈 상태가 순수 텍스트가 아니라 Asset.ContentIcon 아이콘 + 설명 + 보조 CTA인가

## 문제를 발견하면

raw `<div>`/자작 위젯으로 때우지 말고 Pre-built 컴포넌트로 교정하라:
`ScreenScaffold`(골격) · `SummaryHero`/`Amount`(숫자 앵커) · `StateView`(빈/로딩) · `FloatingTabBar`(하단 탭) · `SubmitFooter`/`ButtonStack`(하단 CTA).
교정 후 `npm run test:visual` 재실행 → 스크린샷 재확인.
