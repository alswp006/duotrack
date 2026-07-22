# UI Design Rules (App-in-Toss)

## TDS Design Principles
- TDS components have perfect built-in styles — no additional CSS needed
- Custom CSS is allowed ONLY for layouts TDS doesn't provide (flex, grid containers)
- Adding margin/padding to TDS components breaks the UI — NEVER do this
- Spacing: use TDS Spacing component only (size prop required) — ListRow has NO padding prop

## Mobile UX Requirements
- Touch targets: minimum 44px (TDS components meet this by default)
- Korean as default UI language (Toss user base)
- Loading: `LoadingState`(TDS Skeleton n줄, `src/components/StateView`) — 맨텍스트 "불러오는 중" 금지
- Error: error message + retry button (TDS Button)
- Empty: `EmptyState`(icon + description + 보조 CTA, `src/components/StateView`) — action은 **weak**. 하단 고정 1차 CTA와 같은 라벨·액션을 중복 노출하지 마라(비활성 버튼 중복 = 군더더기)
- 시각 앵커: 홈/결과 최상단에 핵심 숫자 하나를 크게(`SummaryHero`, t1) — '휑함'의 핵심 원인은 숫자 앵커 부재. 금액은 `Amount`(nowrap 줄바꿈 방지)
- 하단 탭 네비: `FloatingTabBar`(템플릿 제공). 활성탭=아이콘+라벨 컬러 틴트만(솔리드 알약/`variant="fill"` 금지). 'TDS TabBar'는 존재하지 않음
- Scroll: natural overscroll, consider pull-to-refresh patterns

## Colors & Dark Mode
- Toss brand primary: handled by TDS theme — NEVER hardcode #3182F6 or any HEX value
- TDS components apply appropriate colors automatically — NEVER hardcode hex values
- Use TDS semantic color tokens only: var(--tds-color-background), var(--tds-color-grey50), etc.
- Dark mode users are 상당수 — hardcoded white/black backgrounds BREAK dark mode
- No external font loading (Toss Products Sans auto-applied)
