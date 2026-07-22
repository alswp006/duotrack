import type {
  GoalConfig,
  StudySession,
  ExamRecord,
  GeneratedProblemSet,
  Diagnosis,
  SaveResult,
  ExamType,
} from "@/lib/types";

const LIMITS = {
  sessions: 200,
  exams: 100,
  problems: 20,
} as const;

const EXAM_TYPES: ExamType[] = ["TOEIC", "OPIC", "TEPS"];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): SaveResult {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch {
    return { ok: false, reason: "quota" };
  }
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

function trimOldest<T>(items: T[], limit: number, keyOf: (item: T) => string): T[] {
  if (items.length <= limit) return items;
  return [...items].sort((a, b) => keyOf(a).localeCompare(keyOf(b))).slice(items.length - limit);
}

function isValidGoal(goal: unknown): goal is GoalConfig {
  if (!goal || typeof goal !== "object") return false;
  const g = goal as Record<string, unknown>;
  if (g.id !== "goal") return false;
  if (!EXAM_TYPES.includes(g.examType as ExamType)) return false;
  if (typeof g.targetScore !== "number" || g.targetScore < 0) return false;
  if (g.currentScore !== null && typeof g.currentScore !== "number") return false;
  if (typeof g.deadline !== "string" || !ISO_DATE_RE.test(g.deadline)) return false;
  if (typeof g.createdAt !== "string" || typeof g.updatedAt !== "string") return false;
  return true;
}

// ── Goal (singleton) ─────────────────────────────────────────────
export function getGoal(): GoalConfig | null {
  const value = getItem<GoalConfig>("duotrack:goal");
  return isValidGoal(value) ? value : null;
}

export function saveGoal(goal: GoalConfig): SaveResult {
  if (!isValidGoal(goal)) return { ok: false, reason: "invalid" };
  return setItem("duotrack:goal", goal);
}

// ── Sessions (max 200, evict oldest by startedAt) ────────────────
export function getSessions(): StudySession[] {
  const value = getItem<StudySession[]>("duotrack:sessions");
  return Array.isArray(value) ? value : [];
}

export function saveSessions(sessions: StudySession[]): SaveResult {
  const trimmed = trimOldest(sessions, LIMITS.sessions, (s) => s.startedAt);
  return setItem("duotrack:sessions", trimmed);
}

// ── Exams (max 100, evict oldest by createdAt) ───────────────────
export function getExams(): ExamRecord[] {
  const value = getItem<ExamRecord[]>("duotrack:exams");
  return Array.isArray(value) ? value : [];
}

export function saveExams(exams: ExamRecord[]): SaveResult {
  const trimmed = trimOldest(exams, LIMITS.exams, (e) => e.createdAt);
  return setItem("duotrack:exams", trimmed);
}

// ── Problem sets (max 20, evict oldest by createdAt) ─────────────
export function getProblems(): GeneratedProblemSet[] {
  const value = getItem<GeneratedProblemSet[]>("duotrack:problems");
  return Array.isArray(value) ? value : [];
}

export function saveProblems(problems: GeneratedProblemSet[]): SaveResult {
  const trimmed = trimOldest(problems, LIMITS.problems, (p) => p.createdAt);
  return setItem("duotrack:problems", trimmed);
}

// ── Diagnosis (singleton) ─────────────────────────────────────────
export function getDiagnosis(): Diagnosis | null {
  const value = getItem<Diagnosis>("duotrack:diagnosis");
  return value && typeof value === "object" ? value : null;
}

export function saveDiagnosis(diagnosis: Diagnosis): SaveResult {
  return setItem("duotrack:diagnosis", diagnosis);
}
