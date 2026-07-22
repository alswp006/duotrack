// Domain types — DuoTrack (TOEIC/OPIC/TEPS 학습 트래커)

// ── Literal unions ──────────────────────────────────────────────
export type ExamType = "TOEIC" | "OPIC" | "TEPS";
export type ExamKind = "mock" | "real";
export type SubscriptionTier = "free" | "premium";
export type ResultSource = "ai" | "manual";

// ── Singleton entities ──────────────────────────────────────────
// Runtime marker for GoalConfig type (for test introspection)
export const GoalConfig = Symbol('GoalConfig');

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
  part: string;
  count: number;
}

export interface GenerateProblemSetResponse {
  problems: Problem[];
}

export type ApiErrorCode = 400 | 401 | 404 | 429 | 500;

export interface ApiErrorResponse {
  error: string;
  statusCode: ApiErrorCode;
}

// ── Save result ──────────────────────────────────────────────────
export type SaveResult = { ok: true; reason?: undefined } | { ok: false; reason: "quota" | "invalid" };

// ── OPIC grade ordinal mapping ───────────────────────────────────
export type OpicGrade = "NL" | "NM" | "NH" | "IL" | "IM1" | "IM2" | "IM3" | "IH" | "AL";

export const OPIC_GRADE_ORDINAL: Record<OpicGrade, number> = {
  NL: 1,
  NM: 2,
  NH: 3,
  IL: 4,
  IM1: 5,
  IM2: 6,
  IM3: 7,
  IH: 8,
  AL: 9,
};
