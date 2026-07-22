# Shared Context (auto-generated — do NOT modify)


## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// Domain types — DuoTrack (TOEIC/OPIC/TEPS 학습 트래커)

// ── Literal unions ──────────────────────────────────────────────
export type ExamType = "TOEIC" | "OPIC" | "TEPS";
export type ExamKind = "mock" | "real";
export type SubscriptionTier = "free" | "premium";
export type ResultSource = "ai" | "manual";

// ── Singleton entities ──────────────────────────────────────────
export interface GoalConfig {
  id: "goal";
  examType: ExamType;
  targetScore: number;
  currentScore: number | null;
  deadline: string; // ISO date (YYYY-MM-DD)
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

export interface SubscriptionState {
  id: "subscription";
  tier: SubscriptionTier;
  activatedAt: string | null;
  weekStartAt: string; // ISO date (YYYY-MM-DD)
  sessionsThisWeek: number;
  reportUnlockedUntil: string | null;
  updatedAt: string;
}

export interface AppFlags {
  id: "flags";
  onboarded: boolean;
  aiNoticeAcknowledged: boolean;
  updatedAt: string;
}

// ── Multi-record entities ───────────────────────────────────────
export interface Diagnosis {
  id: string;
  goalId: string;
  examType: ExamType;
  estimatedScore: number;
  partScores: Record<string, number>;
  weakParts: string[];
  createdAt: string;
  updatedAt: string;
  source: ResultSource;
}

export interface StudySession {
  id: string;
  goalId: string;
  diagnosisId: string | null;
  startedAt: string;
  endedAt: string | null;
  durationMin: number;
  elapsedSec: number;
  partFocus: string;
  examType: ExamType;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExamRecord {
  id: string;
  goalId: string;
  predictedFromDiagnosisId: string | null;
  kind: ExamKind;
  examType: ExamType;
  score: number;
  partScores: Record<string, number>;
  takenAt: string; // ISO date (YYYY-MM-DD)
  predictedScore: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Problem {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface GeneratedProblemSet {
  id: string;
  goalId: string;
  diagnosisId: string | null;
  part: string;
  examType: ExamType;
  problems: Problem[];
  createdAt: string;
  updatedAt: string;
  source: ResultSource;
}

// ── RouteState (navigate() state shapes per path) ───────────────
export type RouteState = {
  "/diagnosis/result": { diagnosisId: string };
  "/session": { partFocus?: string } | undefined;
  "/exam/new": { kind?: ExamKind } | undefined;
  "/exam/detail": { examId: string };
  "/weak": { part?: string } | undefined;
  "/paywall": { from?: string } | undefined;
};

// ── API request/response types ──────────────────────────────────
export interface DiagnoseRequest {
  examType: ExamType;
  answers: number[];
}

export interface DiagnoseResponse {
  estimatedScore: number;
  partScores: Record<string, number>;
  weakParts: string[];
}

export interface GenerateProblemSetRequest {
  examType: ExamType;
  part: s
// ...truncated
```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
  lib/
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- types.ts: export type ExamType = "TOEIC" | "OPIC" | "TEPS"; export type ExamKind = "mock" | "real"; export type SubscriptionTier = "free" | "premium"; export type ResultSource = "ai" | "manual"; export interface GoalConfig; export interface SubscriptionState; export interface AppFlags; export interface Diagnosis
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.