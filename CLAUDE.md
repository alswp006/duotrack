# CLAUDE.md — Project Rules

## MANDATORY: Pre-submission Checklist (run BEFORE finishing)
Every time you finish writing code, you MUST complete ALL of these steps:
1. **Save all files** — ensure no unsaved changes
2. **Run `pnpm typecheck`** — fix ALL TypeScript errors before finishing
3. **Run `pnpm test`** (if test file exists for this packet) — fix failing tests
4. **Verify imports** — check that all imports resolve to existing files
5. **Check for duplicates** — ensure you didn't recreate something that already exists

If any check fails, fix it BEFORE completing. Do NOT leave known errors for later.
This is not optional. Finishing with known typecheck or test errors is a failure.

## CRITICAL: STANDALONE Next.js app (Pages Router)
- INDEPENDENT app, NOT monorepo. Only import from node_modules or src/
- No @ai-factory/*, drizzle-orm, @libsql/client. Check package.json first
- DB: use better-sqlite3, localStorage, or in-memory for MVP
- better-sqlite3 is a native module — NEVER change its version in package.json
- If you add new native modules (sharp, bcrypt, etc.), list them in dependencies so the pipeline can rebuild them
- ALWAYS check existing code before creating new files — avoid duplicates

## CRITICAL: Pages Router Structure
- Pages go in src/pages/ — one file = one route (e.g., src/pages/projects/[id].tsx)
- API routes go in src/pages/api/ (e.g., src/pages/api/auth/login.ts)
- Global layout is src/pages/_app.tsx — UPDATE it, don't recreate
- Global styles are src/styles/globals.css — imported in _app.tsx
- NO src/app/ directory — this project uses Pages Router, NOT App Router
- All components are client-side — NO "use client" directive needed
- Dynamic route params: `const { id } = useRouter().query` (synchronous, no await)

## CRITICAL: Pages Router Data Fetching
- Use getServerSideProps for server-side data:
  ```
  export async function getServerSideProps(context: GetServerSidePropsContext) {
    const { id } = context.params as { id: string };
    const data = await fetchData(id);
    return { props: { data } };
  }
  ```
- Use getStaticProps + getStaticPaths for static data
- Client-side fetching: use useEffect + fetch or SWR
- NEVER use App Router patterns (async components, server actions, use() hook)

## CRITICAL: Middleware (Edge Runtime)
- middleware.ts runs in Edge Runtime — it CANNOT import Node.js modules (fs, path, crypto, better-sqlite3, bcryptjs)
- middleware.ts should ONLY check cookies via request.cookies.get() — NEVER import from lib/auth.ts or lib/db.ts

## CRITICAL: Railway 배포 규칙
- next.config.mjs에 `output: "standalone"` 필수 (이미 설정됨 — 절대 제거하지 마라)
- public/ 디렉토리 필수 (빈 폴더라도 유지)
- 이미지 업로드: uploads/ 디렉토리 사용, /api/uploads/[...path] route로 서빙 (이미 존재)
- 파일 업로드 API 만들 때: multer 대신 Node.js fs로 직접 저장 (uploads/ 디렉토리에)
- 업로드 크기 제한: API route에 `export const config = { api: { bodyParser: { sizeLimit: '50mb' } } }` 설정
- 환경변수: process.env로 접근 (Railway Variables에서 관리)

## Design Documents
- `.ai-factory/spec.md` — Full SPEC with features, ACs, API contracts, DB schema
- `.ai-factory/prd.md` — Product Requirements Document
- `.ai-factory/task.md` — Epic/Task breakdown
- When implementing a packet, ALWAYS read `.ai-factory/spec.md` first to understand the full context.
- Do NOT modify any files in `.ai-factory/`.

## Code Context Tags
- `@AI:ANCHOR` — NEVER modify these lines or functions. They are foundational (auth, DB, UI components).
- `@AI:WARN` — Modify only if absolutely necessary. Explain changes in commit message.
- `@AI:NOTE` — Business logic with specific reasoning. Read the comment before changing.
If you see @AI:ANCHOR on a file or function, do NOT edit it. Create new files/functions instead.

## Git Context Memory
- Recent commits contain `## Context (AI-Developer Memory)` sections
- ALWAYS respect decisions from previous packets (Schema choices, API patterns, naming conventions)
- If a previous packet chose a specific approach (e.g., junction table for many-to-many), follow the same pattern
- Do NOT contradict established patterns unless the current packet explicitly requires it

## Commands
- pnpm install --ignore-workspace / build / typecheck / test / dev
- IMPORTANT: Always use --ignore-workspace with pnpm to avoid monorepo interference
- Build: npx next build (verify it passes before finishing)
- Typecheck: npx tsc --noEmit (fix ALL errors before finishing)

## Testing (MUST use test-utils.ts)
- Write tests in src/__tests__/packet-{id}.test.ts
- ALWAYS import test helpers: `import { setupTestLifecycle, makeAuthedRequest } from "@/lib/test-utils"`
- Use vitest: import {describe,it,expect} from "vitest"

### MANDATORY Test Pattern (follow this EXACTLY):
```typescript
import { describe, it, expect } from "vitest";
import { setupTestLifecycle, makeAuthedRequest } from "@/lib/test-utils";

describe("Feature Name", () => {
  const { getUser, getToken } = setupTestLifecycle(); // auto beforeEach/afterEach

  it("does something", async () => {
    const user = getUser();  // pre-created test user
    const token = getToken(); // pre-created session token
    const req = makeAuthedRequest("http://localhost/api/example", token, {
      method: "POST",
      body: JSON.stringify({ data: "test" }),
    });
    // ... test logic
  });
});
```

### What test-utils provides (DO NOT reimplement):
- `setupTestLifecycle()` — auto DB cleanup + test user + session in beforeEach/afterEach
- `createTestUser()` — unique user with auto-generated email (no UNIQUE constraint issues)
- `createTestSession(userId)` — valid session token for auth
- `makeAuthedRequest(url, token)` — Request with session_token cookie
- `cleanDb()` — deletes all data in correct FK order

### Rules:
- NEVER write manual DB cleanup (cleanDb handles FK order automatically)
- NEVER create test users manually (createTestUser handles unique emails)
- NEVER set cookies manually (makeAuthedRequest handles it)
- better-sqlite3: All DB calls are SYNCHRONOUS — use db.prepare().run(), NOT await
- Run pnpm test + pnpm typecheck before finishing

## CRITICAL: Auth Cookie Pattern
- Cookie name is "session_token" — this is set by createSession() in src/lib/auth.ts
- Middleware checks cookies via request.cookies.get("session_token") — MUST match
- Signup returns status 201, Login returns status 200
- If template auth already exists (src/lib/auth.ts), use createSession()/destroySession() — do NOT reimplement
- For NEW API routes that need auth, read cookie from request headers:
  ```
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/session_token=([^;]+)/);
  const token = match?.[1] ?? null;
  const userId = token ? getSessionUserId(token) : null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  ```
- NEVER change the cookie name — middleware.ts, auth.ts, and all API routes must agree on "session_token"
- For tests: use createSessionToken(userId) from @/lib/auth to create test sessions without cookies() API

## Shared Types (CRITICAL)
- src/lib/types.ts — 모든 도메인 타입과 API shape 정의
- ALWAYS: import type { User, MealLog } from "@/lib/types"
- NEVER: 같은 타입을 다른 파일에서 재정의
- 타입이 부족하면 types.ts에 추가 (다른 파일에 정의 금지)

## Code Style
- TypeScript strict, Next.js Pages Router, all files in src/
- Tailwind CSS only (no inline styles), no .eslintrc files
- All imports must resolve — verify with pnpm typecheck

## Code Quality (CRITICAL — your code will be reviewed by AI)
- Single Responsibility: Each file/component should do ONE thing. If a component exceeds ~150 lines, extract sub-components.
- DRY: Before creating new helpers, check existing code in src/lib/ and src/components/. Import and reuse.
- Error Handling: Every fetch/API call must have try/catch. Show loading states (skeleton/spinner) during async ops. Show user-friendly error messages with retry option.
- TypeScript: Use explicit return types for exported functions. NEVER use `any` — use `unknown` and narrow with type guards.
- Naming: Descriptive names (getUserById not getData). Constants in UPPER_SNAKE_CASE. Components in PascalCase.
- No Magic Numbers: Extract into named constants (MAX_ITEMS = 10, DEBOUNCE_MS = 300).
- Accessibility: aria-label on icon-only buttons. Semantic HTML (nav, main, section, article). Link form labels to inputs.
- Performance: Avoid unnecessary re-renders (useCallback/useMemo where appropriate). Use dynamic imports for heavy components. Lazy-load images below fold.
- Pattern Consistency: Match existing codebase patterns. Don't introduce new patterns when existing ones work.

## Common Build Error Prevention
- Image component: use next/image with width+height or fill prop
- Link component: import from next/link, no nested <a> tags
- JSON imports: add "resolveJsonModule": true in tsconfig if needed
- Missing types: check @types/ packages are in devDependencies

## Design System — shadcn/ui + "Linear meets Notion" aesthetic
Read `.claude/skills/frontend-design/SKILL.md` for full aesthetic direction.
Read `.impeccable.md` for project-specific design context (audience, brand, aesthetic).

## Available Design Skills (Impeccable)
These skills are in .claude/skills/ — use them for design guidance:
- **frontend-design**: Core design principles and anti-patterns (READ FIRST)
- **audit**: Technical quality audit (a11y, perf, theming, responsive). Run after completing UI work.
- **critique**: UX design critique with heuristic scoring
- **polish**: Final quality pass for alignment, spacing, consistency
- **normalize**: Realign UI to design system standards
- **harden**: Production hardening — text overflow, error/loading/empty states
- **teach-impeccable**: SKIP — context already in .impeccable.md

### Component Library (ALWAYS use — never raw HTML buttons/inputs/cards)
```tsx
import { Button } from "@/components/ui/button"    // variant: default|outline|ghost|secondary|destructive
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"       // variant: default|success|error|warning
import { Skeleton } from "@/components/ui/skeleton"  // Loading placeholders: <Skeleton className="h-8 w-48" />
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"  // User avatars
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"  // Tabbed interfaces
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"  // Modal dialogs
import { Select } from "@/components/ui/select"     // Native select with styling + label prop
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"  // Data tables
import { cn } from "@/lib/utils"                    // Class merging: cn("base", conditional && "extra")
```
- Button asChild pattern for links: `<Button asChild><Link href="/x" className="no-underline">Go</Link></Button>`
- Ghost nav links: `<Button variant="ghost" size="sm" asChild>`
- Loading states: `<Skeleton className="h-8 w-48 rounded-lg" />` (not animate-pulse)
- Dialogs: `<Dialog open={open} onOpenChange={setOpen}><DialogContent>...</DialogContent></Dialog>`
- Tabs: `<Tabs defaultValue="tab1"><TabsList><TabsTrigger value="tab1">Tab</TabsTrigger></TabsList><TabsContent value="tab1">...</TabsContent></Tabs>`

### Layout Rules
- Page wrapper: NO max-width (full-bleed backgrounds)
- Each section: `<section className="w-full py-20"><div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">{content}</div></section>`
- Hero: min-h-[70vh] flex items-center, gradient bg spans full width
- ALL sections same max-w on wrapper; constrain inner content separately
- Responsive: grid-cols-1 md:grid-cols-2 lg:grid-cols-3, flex-col md:flex-row

### CRITICAL: CSS Specificity (Tailwind v4) — DO NOT VIOLATE
- `@import "tailwindcss"` puts utilities in `@layer utilities`
- Any CSS OUTSIDE `@layer` has HIGHER specificity → silently overrides ALL Tailwind utilities (pt-16, px-4, gap-6, mb-4, text-white, etc.)
- This means `* { padding: 0 }` outside @layer will BREAK EVERY LAYOUT IN THE APP
- ALWAYS wrap base/reset/element styles in `@layer base { }`
- ALWAYS wrap custom utility classes in `@layer components { }`
- ONLY `:root` (CSS variable declarations) and scrollbar pseudo-elements may be outside @layer
- If you edit globals.css: VERIFY every non-:root rule is inside an @layer block

### Colors (CSS vars ONLY — never hardcode hex)
- bg: var(--bg), var(--bg-elevated), var(--bg-card), var(--bg-card-hover), var(--bg-input)
- text: var(--text), var(--text-secondary), var(--text-muted), var(--text-inverse)
- accent: var(--accent), var(--accent-hover), var(--accent-soft)
- border: var(--border), var(--border-hover), var(--border-focus)
- semantic: var(--success), var(--success-soft), var(--danger), var(--danger-soft), var(--warning), var(--warning-soft)
- ring: var(--ring) for focus rings

### Typography Scale (MANDATORY — maintain clear visual hierarchy)
- Hero headings: text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight
- Page titles: text-3xl font-bold
- Section headings: text-2xl font-semibold
- Card titles: text-lg font-semibold
- Body text: text-base leading-relaxed
- Meta/timestamps: text-sm text-[var(--text-secondary)]
- Labels: text-sm font-medium
- Captions/hints: text-xs text-[var(--text-muted)]
- RULE: No two adjacent heading levels should look the same — always vary size AND weight

### Spacing Scale (MANDATORY — generous whitespace like Linear/Notion)
- Page sections: py-20 md:py-28 (vertical), px-4 sm:px-6 lg:px-8 (horizontal)
- Section content: max-w-6xl mx-auto (or max-w-5xl for narrower content)
- Card padding: p-6 md:p-8
- Form field gaps: gap-4 (between fields), gap-6 (between form sections)
- List item spacing: gap-3
- Icon + text: gap-2
- Grid gaps: gap-6 md:gap-8
- Hero CTA margin: mb-16 md:mb-20
- RULE: When in doubt, add MORE whitespace, not less

### UI State Patterns (EVERY page/component must handle ALL applicable states)
- Loading: Use `skeleton` class (shimmer animation defined in globals.css) or `animate-pulse` with bg-[var(--bg-card)]
  ```tsx
  <div className="skeleton h-8 w-48 rounded-lg" />   {/* text skeleton */}
  <div className="skeleton h-40 w-full rounded-xl" /> {/* card skeleton */}
  ```
- Empty state: Centered icon (lucide-react, 48px, text-muted) + heading + description + CTA button
  ```tsx
  <div className="flex flex-col items-center py-20 text-center">
    <FileText className="h-12 w-12 text-[var(--text-muted)] mb-4" />
    <h3 className="text-lg font-semibold mb-2">No items yet</h3>
    <p className="text-sm text-[var(--text-secondary)] mb-6">Get started by creating your first item.</p>
    <Button>Create Item</Button>
  </div>
  ```
- Error state: bg-[var(--danger-soft)] banner with AlertCircle icon + error message + retry button
- Success state: bg-[var(--success-soft)] banner with CheckCircle icon + message (auto-dismiss via animate-in)
- Disabled state: opacity-50 cursor-not-allowed pointer-events-none

### Page Layout Templates (follow these patterns for consistency)
- Landing: Hero(min-h-[70vh] gradient bg) → HowItWorks(3-step numbered) → Features(3-col icon grid) → CTA(full-width accent bg) → Footer
- Auth (login/signup): centered max-w-md Card on min-h-screen background
- Dashboard: Stats row (3-col grid of metric Cards) → Data section (list/table with filters)
- Settings: Sidebar nav + content area, or stacked sections with Cards
- Detail/Edit: Breadcrumb → Title → Content Card with form or display

### Hover & Interaction States (REQUIRED on all interactive elements)
- Buttons: hover:bg-[var(--accent-hover)] transition-all duration-150 active:scale-[0.98]
- Cards: hover:border-[var(--border-hover)] hover:bg-[var(--bg-card-hover)] hover:shadow-lg transition-all duration-200
- Links: hover:text-[var(--accent)] transition-colors
- Inputs: focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]
- List items: hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer

### Anti-patterns (FORBIDDEN — these cause quality score deductions)
- Cramped layouts — generous whitespace, never tight micro-spacing
- Flat hierarchy — vary size, weight, and color between heading levels
- Unstyled elements — every button/link needs rounded corners + hover state + transition
- Narrow trapped content — full-bleed sections with constrained inner content
- Raw HTML for buttons/inputs/cards — ALWAYS use shadcn components from @/components/ui/
- Missing loading states — NEVER show blank screen while data loads
- Missing empty states — ALWAYS show helpful message + CTA when no data
- Hardcoded colors (#3b82f6) — ALWAYS use CSS variables
- Same-size adjacent text — ALWAYS create visual hierarchy with different sizes/weights

## Navigation
- Every page reachable from header nav. Login<->Signup cross-linked.
- Layout at src/pages/_app.tsx — UPDATE it, don't recreate.
- Nav component at src/components/ui/nav.tsx — add links for new pages here.

## TDD: Tests already exist — make them PASS
A test file `src/__tests__/packet-{PACKET_ID}.test.ts` has been pre-written based on acceptance criteria.
Your job is to write code that makes ALL tests pass.

1. Read the test file FIRST to understand expected behavior
2. Implement the code that satisfies the tests
3. Run `npx vitest run src/__tests__/packet-{PACKET_ID}.test.ts` to verify
4. If a test fails, read the error and fix your CODE (not the test)
5. Only modify tests if they have import errors that don't match your file structure

CRITICAL: The tests define the requirements. Your code must match them, not the other way around.

## Verification Gate (증거 없이 완료 선언 금지)
You MUST make all pre-written tests pass. Repeat fix→check up to 3 times.

1. `npx vitest run src/__tests__/packet-{PACKET_ID}.test.ts` — THIS IS THE MOST IMPORTANT CHECK
   - Tests define the requirements — your code must satisfy them
   - If tests fail, fix your CODE (not the tests)
   - Only fix tests if they have wrong import paths
2. `pnpm typecheck` — fix any TypeScript errors
3. `npx next build` — verify build succeeds

### Verification Rules
- 모든 검증 커맨드를 직접 실행하고 출력(exit code, 결과)을 확인하라
- "아마 통과할 것이다"는 증거가 아니다 — 반드시 fresh 실행
- 테스트 0건 통과는 "테스트 성공"이 아니다 — 실제 테스트가 실행되었는지 확인
- 이전 실행 결과에 의존하지 마라 — 코드 변경 후 반드시 재실행
- "should work", "probably passes" 같은 불확실한 언어 사용 금지

CRITICAL: Your code is NOT done until the pre-written tests pass.
The tests were carefully written based on acceptance criteria — they are the source of truth.

## Final Checklist (run before finishing)
1. pnpm typecheck — zero errors
2. pnpm test — all tests pass
3. npx next build — builds successfully
4. No unresolved imports

## Preserved Template Rules


## Navigation
- Every page reachable from header nav. Login<->Signup cross-linked.
- Layout at src/pages/_app.tsx — UPDATE it, don't recreate.
- Nav component at src/components/ui/nav.tsx — add links for new pages here.
