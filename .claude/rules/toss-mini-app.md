# App-in-Toss Mini App — Absolute Rules

## GROUND TRUTH for SDK
**Read `.ai-factory/apps-in-toss-essential.txt` before using any `@apps-in-toss/web-framework` API.** It contains verified exports. If an API is not listed there, it does not exist — do not guess. The apps-in-toss MCP is for TDS component docs/examples only — for SDK APIs, trust this file (`.d.ts`-verified), not the MCP.

## TDS Components Mandatory (Highest Priority)
- **BEFORE writing UI**: query the apps-in-toss MCP (search_tds_web_docs / get_tds_web_doc / get_example) for the exact component API. WebView track only — never use tds_rn tools. If the MCP is unavailable, fall back to `.ai-factory/tds-reference.txt`.
- ALL UI MUST use TDS (`@toss/tds-mobile`) components exclusively
- shadcn/ui, MUI, Ant Design, Chakra UI → instant review rejection
- NEVER override TDS component margin/padding with Tailwind or inline styles
- Spacing: use TDS `Spacing` component (size prop required) — NEVER inline margin/padding
- **새 페이지 작성 시 `.ai-factory/tds-patterns.md` + `src/components/` Pre-built 컴포넌트 먼저 확인** — ScreenScaffold/SummaryHero/Card/Amount/SubmitFooter/StateView/FloatingTabBar 조립이 우선. raw div 골격·자작 nav 금지. 가까운 패턴을 변형하세요.
- **버튼 중첩 금지**: `FixedBottomCTA`/`BottomCTA`/`CTAButton`은 **자체가 `<button>`**이다(.d.ts: HTMLButtonElement) → 안에 `<Button>`을 넣으면 `<button><button>`(무효 HTML/validateDOMNesting). children에 라벨을 직접 넣거나 `SubmitFooter`를 써라. 2개 버튼은 `FixedBottomCTA.Double` 또는 커스텀 div+Button. (ListRow `onClick`은 `<li role=button>`이라 내부 버튼이 `<li><button>`=유효 HTML이지만, a11y상 행 내부 액션은 `right` 슬롯 IconButton 권장.)
- **TextField placeholder 필수**: `variant="box"|"line"`은 플로팅 라벨이라 빈 칸+비포커스에서 라벨이 위로 떠 **숨는다** → `placeholder`를 안 주면 빈 회색 박스가 된다(무엇을 입력할지 알 수 없음). label과 placeholder를 항상 함께.
- **하단 탭 활성표시**: 아이콘+라벨 컬러 틴트만 — 솔리드 알약/`Button variant="fill"` 금지(네이티브 토스 탭과 불일치).
- **시각 앵커**: 홈/결과 최상단에 핵심 숫자 하나를 크게(SummaryHero, t1). '휑함'의 가장 큰 원인은 숫자 앵커 부재. 금액은 raw 텍스트 대신 `Amount`(줄바꿈 방지).
- Fallback TDS doc (when the MCP is unavailable): `.ai-factory/tds-reference.txt` — official TDS LLM doc
- "모르면 지어내지 마라": tds-essential.txt/tds-reference.txt에 없는 prop은 존재하지 않음 → 추측 사용 금지
- TDS로 구현 불확실 → 기본 HTML + `var(--adaptive*)` 또는 `var(--tds-color-*)` CSS 변수로 대체 (Tailwind 금지)

## TDS Core 11 Components (assemble like building blocks)
1. ListRow — list item (ListRow.Texts with type/top/bottom — NO padding prop)
2. Button — button (variant: 'fill' | 'weak' ONLY)
3. TextField — text input (variant: 'box' | 'line' | 'big' | 'hero' REQUIRED)
4. Paragraph.Text — text display (typography: t1~t7, st1~st13)
5. Chip — tag/filter
6. Switch — switch (NOT "Toggle" — Toggle component does not exist in TDS)
7. AlertDialog — modal dialog (NOT "Dialog")
8. BottomSheet — bottom sheet
9. Toast — toast notification (open + position REQUIRED)
10. Top — top navigation bar (NOT "AppBar", title prop REQUIRED)
11. (하단 탭 네비) — TDS에 **TabBar 컴포넌트는 없다**(환각). main nav가 2~5탭이면 템플릿 제공 `src/components/FloatingTabBar` 사용(활성탭=아이콘+라벨 컬러 틴트, 솔리드 알약/Button fill 금지). `Tab`은 상단 콘텐츠 전환용(하단 nav 아님).

## Server-Side Code Forbidden
- No Next.js (Vite + React only, or granite framework)
- No API Routes, getServerSideProps, server components
- No Node.js-only modules (fs, path, crypto, better-sqlite3)
- Data storage: browser localStorage or SDK `Storage` (native persistence) or external API via fetch

## App-in-Toss SDK — Imperative API only

**CRITICAL**: The SDK does NOT provide React hooks. There is no `useTossLogin`, `useTossAd`, `useTossPayment`, `useTossPromotion`. Using these names in code is a FAIL.

**CRITICAL — SDK는 WebView 밖에서 *예외를 던진다*(false 반환 아님)**: 토스 네이티브 브릿지가 없는 환경(로컬 브라우저, 검수자 PC, jsdom)에서는 모든 SDK 호출·probe(`*.isSupported()` 포함)가 `false`를 *반환*하는 게 아니라 **throw**한다. 가드하지 않으면 그 throw가 effect/render를 탈출 → **React 트리 전체 언마운트 → 첫 화면부터 흰 화면**(검수 즉시 반려).
- 모든 SDK 호출·probe를 **try/catch로 감싸고** 실패 시 조용히 degrade(빈 영역/no-op):
  ```typescript
  // ❌ 흰 화면 유발 — isSupported가 throw
  if (TossAds.attachBanner.isSupported()) { ... }
  // ✅ 가드
  function supported() { try { return TossAds.attachBanner.isSupported?.() === true; } catch { return false; } }
  ```
- **마운트 시(useEffect) 호출되는 SDK**(광고 attach, `getSafeAreaInsets`, `getIsTossLoginIntegratedService` 등)는 반드시 가드. 이벤트 핸들러의 `generateHapticFeedback`/`setClipboardText`도 `try { Promise.resolve(call()).catch(()=>{}); } catch {}`로 감싸 미처리 거부 제거.
- 검증: `npm run dev` 후 일반 브라우저에서 **흰 화면이 아니어야** 한다(서버측 헤드리스 렌더 게이트가 #root 미마운트를 배포 전 차단함).

Patterns below. For exact signatures, read `.ai-factory/apps-in-toss-essential.txt`.

### Login — no code needed
Toss app session is automatic. Check integration status if needed:
```typescript
import { getIsTossLoginIntegratedService } from '@apps-in-toss/web-framework';
const integrated = await getIsTossLoginIntegratedService();
```
Do NOT attempt to call any `login()` function.

### Payment (IAP)
```typescript
// ⚠️ IAP는 `IAP` 네임스페이스 아래에 있다(.d.ts 검증). 최상위 import는 빌드 에러.
import { IAP } from '@apps-in-toss/web-framework';
const cleanup = IAP.createOneTimePurchaseOrder({   // 반환: cleanup 함수
  options: {
    sku: 'sku-id',
    processProductGrant: async ({ orderId }) => { /* backend */ return true; },
  },
  onEvent: (e) => { /* e.data.orderId etc. */ },
  onError: (err) => { /* ... */ },
});
```
For subscriptions: `IAP.createSubscriptionPurchaseOrder` (same pattern + `offerId` option).
React 컴포넌트가 필요하면 템플릿의 `src/components/TossPurchase.tsx`(가드+cleanup 래퍼)를 쓴다.
NEVER use Stripe, PG, or external payment.

### Ads
Imperative API with callback. React wrappers are NOT in the SDK:
```typescript
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';

// For reward/interstitial ads
loadFullScreenAd({ slotId: 'result-unlock', onEvent: (e) => { /* loaded */ }, onError: (err) => {} });
showFullScreenAd({ slotId: 'result-unlock', onEvent: (e) => { /* rewarded/dismissed */ }, onError: (err) => {} });
```
Banner: `TossAds.initialize({})` then `TossAds.attachBanner(adGroupId, targetEl, options?)` returning `{ destroy }`. All methods expose `.isSupported()`. (NOT `loadAdMob` / `showAdMob` — those don't exist in the SDK.)

**If you need a React gate component (e.g., "watch ad before seeing result"), build it in `src/components/` yourself using the imperative API above.** Do NOT import `TossRewardAd` or `AdSlot` from the SDK — they don't exist.

Reward Ad Pattern: gate only the final payoff moment — never intermediate steps or navigation.

### Promotion (user rewards)
```typescript
import { grantPromotionReward } from '@apps-in-toss/web-framework';
await grantPromotionReward({ promotionCode: 'CONSOLE_CODE', amount: 1000 });
```
- 1인당 누적 5,000원 한도 (`amount > 5000` 호출 금지)
- `promotionCode`는 앱인토스 콘솔 발급 필수
- 활용: 첫 사용 보상, 친구 초대, 이벤트

### Navigation
NEVER use `window.location.href` for external URLs. Use `openURL` from SDK (subject to review policy — external links discouraged).

### Storage
Either browser localStorage (ephemeral, test-friendly) or SDK `Storage` (native persistence):
```typescript
import { Storage } from '@apps-in-toss/web-framework';
await Storage.setItem('key', JSON.stringify(data));
const raw = await Storage.getItem('key');
```

### Analytics — SDK only, external tools forbidden
```typescript
import { Analytics } from '@apps-in-toss/web-framework';
Analytics.screen({ log_name: 'Home' });
Analytics.click({ log_name: 'CTA', salary: 50000000 });
```

## 인앱광고 수수료 정책 (2026.04.01~)
- 인앱광고(IAA) 수수료 15% 적용
- 순수익 = 총수익 × 0.85
- 외부 로깅/분석 솔루션 (GA, Amplitude 등) 사용 금지

## Native Vibe (토스 네이티브 품질 필수)
- **Haptic feedback**: 주요 CTA 버튼에 `generateHapticFeedback({ type: 'success' })`, Toggle/Chip에 `tickWeak`
  ```typescript
  import { generateHapticFeedback } from '@apps-in-toss/web-framework';
  ```
- **Dark mode**: HEX 색상(#FFFFFF, #333 등) 하드코딩 절대 금지 — TDS 컴포넌트 또는 `var(--tds-color-*)` CSS 변수만
- **Safe area**: `position: fixed` 하단 요소에 `paddingBottom: calc(Npx + env(safe-area-inset-bottom))` 필수. `height: 100vh` 단독 금지 → `100dvh`

## 생성형 AI 고지 의무 (해당 시 필수 — 위반 시 과태료 3,000만원)
앱이 AI 기반 결과물(추천/분석/요약/생성)을 사용자에게 노출하는 경우:
- 첫 이용 시 "이 서비스는 생성형 AI를 활용합니다" AlertDialog로 1회 고지
- AI 결과물에 "AI가 생성한 결과입니다" Paragraph.Text(typography="st13") 라벨 표시

## Bundle Limits
- Build output MUST be under 100MB
- Avoid heavy libraries: D3, Three.js, heavy charting libs
- Images/videos: use external CDN
