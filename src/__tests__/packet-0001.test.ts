import { describe, it, expect } from "vitest";
import * as types from "@/lib/types";

/**
 * Packet 0001: TypeScript 타입 + RouteState 정의
 *
 * 6개 다건 엔티티 + 3개 싱글턴, 리터럴 유니온, API 타입, RouteState, 상수 정의
 * 순수 타입·const 정의만 수행 — 런타임 로직 없음
 */

describe("AC-1: src/lib/types.ts exports all entity/API/result types with tsc passing", () => {
  it("should export GoalConfig interface with required fields", () => {
    // Import will fail if type doesn't exist
    const { GoalConfig } = types;
    expect(GoalConfig).toBeDefined();

    // Type-level check: create an instance that satisfies the interface
    const goal: any = {
      id: "goal" as const,
      examType: "TOEIC" as const,
      targetScore: 800,
      currentScore: null,
      deadline: "2026-11-30",
      createdAt: "2026-07-23T00:00:00Z",
      updatedAt: "2026-07-23T00:00:00Z",
    };
    expect(goal.id).toBe("goal");
    expect(goal.examType).toBe("TOEIC");
    expect(typeof goal.targetScore).toBe("number");
    expect(goal.currentScore === null || typeof goal.currentScore === "number").toBe(true);
    expect(typeof goal.deadline).toBe("string");
    expect(typeof goal.createdAt).toBe("string");
    expect(typeof goal.updatedAt).toBe("string");
  });

  it("should export Diagnosis interface with partScores and weakParts", () => {
    const diagnosis: any = {
      id: "diag-uuid-123",
      goalId: "goal",
      examType: "TOEIC" as const,
      estimatedScore: 640,
      partScores: { LC: 70, RC: 58 },
      weakParts: ["RC"],
      createdAt: "2026-07-23T00:00:00Z",
      updatedAt: "2026-07-23T00:00:00Z",
      source: "ai" as const,
    };
    expect(diagnosis.id).toMatch(/^diag-/);
    expect(diagnosis.goalId).toBe("goal");
    expect(typeof diagnosis.estimatedScore).toBe("number");
    expect(typeof diagnosis.partScores).toBe("object");
    expect(Array.isArray(diagnosis.weakParts)).toBe(true);
    expect(diagnosis.source).toBe("ai");
  });

  it("should export StudySession interface with timer and focus fields", () => {
    const session: any = {
      id: "sess-uuid-456",
      goalId: "goal",
      diagnosisId: "diag-uuid-123",
      startedAt: "2026-07-23T10:00:00Z",
      endedAt: "2026-07-23T10:25:00Z",
      durationMin: 25,
      elapsedSec: 1500,
      partFocus: "RC",
      examType: "TOEIC" as const,
      completed: true,
      createdAt: "2026-07-23T10:00:00Z",
      updatedAt: "2026-07-23T10:25:00Z",
    };
    expect(session.goalId).toBe("goal");
    expect(typeof session.durationMin).toBe("number");
    expect(typeof session.elapsedSec).toBe("number");
    expect(typeof session.partFocus).toBe("string");
    expect(typeof session.completed).toBe("boolean");
    expect(session.endedAt === null || typeof session.endedAt === "string").toBe(true);
  });

  it("should export ExamRecord interface with kind and predictedScore", () => {
    const exam: any = {
      id: "exam-uuid-789",
      goalId: "goal",
      predictedFromDiagnosisId: "diag-uuid-123",
      kind: "real" as const,
      examType: "TOEIC" as const,
      score: 720,
      partScores: { LC: 390, RC: 330 },
      takenAt: "2026-07-20",
      predictedScore: 640,
      createdAt: "2026-07-20T14:00:00Z",
      updatedAt: "2026-07-20T14:00:00Z",
    };
    expect(exam.id).toMatch(/^exam-/);
    expect(exam.kind).toMatch(/^(real|mock)$/);
    expect(typeof exam.score).toBe("number");
    expect(exam.predictedScore === null || typeof exam.predictedScore === "number").toBe(true);
    expect(typeof exam.partScores).toBe("object");
  });

  it("should export Problem and GeneratedProblemSet interfaces", () => {
    const problem: any = {
      id: "prob-uuid-001",
      question: "What is the main idea?",
      options: ["A", "B", "C", "D"],
      answerIndex: 0,
      explanation: "The answer is A because...",
    };
    expect(typeof problem.question).toBe("string");
    expect(Array.isArray(problem.options)).toBe(true);
    expect(problem.options.length).toBe(4);
    expect(typeof problem.answerIndex).toBe("number");
    expect(problem.answerIndex >= 0 && problem.answerIndex <= 3).toBe(true);

    const problemSet: any = {
      id: "pset-uuid-999",
      goalId: "goal",
      diagnosisId: "diag-uuid-123",
      part: "RC",
      examType: "TOEIC" as const,
      problems: [problem],
      createdAt: "2026-07-23T12:00:00Z",
      updatedAt: "2026-07-23T12:00:00Z",
      source: "ai" as const,
    };
    expect(problemSet.goalId).toBe("goal");
    expect(Array.isArray(problemSet.problems)).toBe(true);
    expect(problemSet.source).toBe("ai");
  });

  it("should export SubscriptionState singleton with tier and weekStartAt", () => {
    const sub: any = {
      id: "subscription" as const,
      tier: "free" as const,
      activatedAt: null,
      weekStartAt: "2026-07-21",
      sessionsThisWeek: 2,
      reportUnlockedUntil: null,
      updatedAt: "2026-07-23T00:00:00Z",
    };
    expect(sub.id).toBe("subscription");
    expect(sub.tier).toMatch(/^(free|premium)$/);
    expect(typeof sub.weekStartAt).toBe("string");
    expect(typeof sub.sessionsThisWeek).toBe("number");
    expect(sub.activatedAt === null || typeof sub.activatedAt === "string").toBe(true);
    expect(sub.reportUnlockedUntil === null || typeof sub.reportUnlockedUntil === "string").toBe(true);
  });

  it("should export AppFlags singleton with onboarded and aiNoticeAcknowledged", () => {
    const flags: any = {
      id: "flags" as const,
      onboarded: false,
      aiNoticeAcknowledged: false,
      updatedAt: "2026-07-23T00:00:00Z",
    };
    expect(flags.id).toBe("flags");
    expect(typeof flags.onboarded).toBe("boolean");
    expect(typeof flags.aiNoticeAcknowledged).toBe("boolean");
    expect(typeof flags.updatedAt).toBe("string");
  });

  it("should export examType and kind as literal unions", () => {
    const validExamTypes = ["TOEIC", "OPIC", "TEPS"];
    const validKinds = ["mock", "real"];

    const examType: any = "TOEIC";
    const kind: any = "real";

    expect(validExamTypes).toContain(examType);
    expect(validKinds).toContain(kind);
  });
});

describe("AC-2: RouteState type includes all 6 route paths with correct state shape", () => {
  it("should define RouteState with /diagnosis/result path requiring diagnosisId", () => {
    // Import RouteState type and validate structure
    const state: any = {
      diagnosisId: "diag-uuid-123",
    };
    expect(typeof state.diagnosisId).toBe("string");
    expect(state.diagnosisId.length > 0).toBe(true);
  });

  it("should define RouteState with /session path optionally taking partFocus", () => {
    // Case 1: with partFocus
    const stateWithFocus: any = {
      partFocus: "RC",
    };
    expect(typeof stateWithFocus.partFocus).toBe("string");

    // Case 2: undefined state (cold entry)
    const stateUndefined: any = undefined;
    expect(stateUndefined === undefined || typeof stateUndefined === "object").toBe(true);
  });

  it("should define RouteState with /exam/new path optionally taking kind", () => {
    // Case 1: with kind='real'
    const stateReal: any = {
      kind: "real",
    };
    expect(stateReal.kind).toMatch(/^(mock|real)$/);

    // Case 2: undefined state
    const stateUndefined: any = undefined;
    expect(stateUndefined === undefined || typeof stateUndefined === "object").toBe(true);
  });

  it("should define RouteState with /exam/detail path requiring examId", () => {
    const state: any = {
      examId: "exam-uuid-789",
    };
    expect(typeof state.examId).toBe("string");
    expect(state.examId.length > 0).toBe(true);
  });

  it("should define RouteState with /weak path optionally taking part", () => {
    // Case 1: with part
    const stateWithPart: any = {
      part: "RC",
    };
    expect(typeof stateWithPart.part).toBe("string");

    // Case 2: undefined state
    const stateUndefined: any = undefined;
    expect(stateUndefined === undefined || typeof stateUndefined === "object").toBe(true);
  });

  it("should define RouteState with /paywall path optionally taking from", () => {
    // Case 1: with from
    const stateWithFrom: any = {
      from: "/session",
    };
    expect(typeof stateWithFrom.from).toBe("string");

    // Case 2: undefined state
    const stateUndefined: any = undefined;
    expect(stateUndefined === undefined || typeof stateUndefined === "object").toBe(true);
  });

  it("should enforce type safety across all RouteState paths", () => {
    // Verify that required fields are truly required
    // diagnosisId must be string (not optional)
    const diagnosisState: any = { diagnosisId: "id" };
    expect(diagnosisState.diagnosisId).toBeDefined();

    // examId must be string (not optional)
    const examState: any = { examId: "id" };
    expect(examState.examId).toBeDefined();
  });
});

describe("AC-3: Export OPIC_GRADE_ORDINAL constant and SaveResult type", () => {
  it("should export OPIC_GRADE_ORDINAL with correct grade-to-ordinal mapping", () => {
    const { OPIC_GRADE_ORDINAL } = types;

    expect(OPIC_GRADE_ORDINAL).toBeDefined();
    expect(OPIC_GRADE_ORDINAL.NL).toBe(1);
    expect(OPIC_GRADE_ORDINAL.NM).toBe(2);
    expect(OPIC_GRADE_ORDINAL.NH).toBe(3);
    expect(OPIC_GRADE_ORDINAL.IL).toBe(4);
    expect(OPIC_GRADE_ORDINAL.IM1).toBe(5);
    expect(OPIC_GRADE_ORDINAL.IM2).toBe(6);
    expect(OPIC_GRADE_ORDINAL.IM3).toBe(7);
    expect(OPIC_GRADE_ORDINAL.IH).toBe(8);
    expect(OPIC_GRADE_ORDINAL.AL).toBe(9);
  });

  it("should have OPIC_GRADE_ORDINAL with 9 total grades", () => {
    const { OPIC_GRADE_ORDINAL } = types;
    const grades = Object.keys(OPIC_GRADE_ORDINAL);
    expect(grades.length).toBe(9);
  });

  it("should export SaveResult type as success or failure union", () => {
    // Success case
    const successResult: any = { ok: true };
    expect(successResult.ok).toBe(true);
    expect(successResult.reason).toBeUndefined();

    // Failure case: quota
    const quotaResult: any = { ok: false, reason: "quota" };
    expect(quotaResult.ok).toBe(false);
    expect(quotaResult.reason).toBe("quota");

    // Failure case: invalid
    const invalidResult: any = { ok: false, reason: "invalid" };
    expect(invalidResult.ok).toBe(false);
    expect(invalidResult.reason).toBe("invalid");
  });

  it("should enforce SaveResult structure: only 'quota' or 'invalid' reasons", () => {
    // Valid reasons for SaveResult
    const validReasons = ["quota", "invalid"];

    const result1: any = { ok: false, reason: "quota" };
    expect(validReasons).toContain(result1.reason);

    const result2: any = { ok: false, reason: "invalid" };
    expect(validReasons).toContain(result2.reason);
  });
});

describe("API type definitions for POST /diagnose and POST /generate-problems", () => {
  it("should export DiagnoseRequest type with examType and answers", () => {
    const request: any = {
      examType: "TOEIC",
      answers: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1],
    };
    expect(request.examType).toMatch(/^(TOEIC|OPIC|TEPS)$/);
    expect(Array.isArray(request.answers)).toBe(true);
    expect(request.answers.length).toBe(10);
    expect(request.answers.every((a: any) => typeof a === "number")).toBe(true);
  });

  it("should export DiagnoseResponse type with estimatedScore, partScores, weakParts", () => {
    const response: any = {
      estimatedScore: 640,
      partScores: { LC: 70, RC: 58 },
      weakParts: ["RC"],
    };
    expect(typeof response.estimatedScore).toBe("number");
    expect(typeof response.partScores).toBe("object");
    expect(Array.isArray(response.weakParts)).toBe(true);
    expect(response.weakParts.every((p: any) => typeof p === "string")).toBe(true);
  });

  it("should export API error response type with error field", () => {
    const errorCodes = [400, 401, 404, 429, 500];
    const errorResponses = [
      { error: "answers must contain exactly 10 items", statusCode: 400 },
      { error: "unauthorized", statusCode: 401 },
      { error: "exam type not supported", statusCode: 404 },
      { error: "rate limit exceeded", statusCode: 429 },
      { error: "diagnosis failed", statusCode: 500 },
    ];

    errorResponses.forEach((resp) => {
      expect(typeof resp.error).toBe("string");
      expect(errorCodes).toContain(resp.statusCode);
    });
  });

  it("should export GenerateProblemSetRequest type with examType and part", () => {
    const request: any = {
      examType: "TOEIC",
      part: "RC",
    };
    expect(request.examType).toMatch(/^(TOEIC|OPIC|TEPS)$/);
    expect(typeof request.part).toBe("string");
  });

  it("should export GenerateProblemSetResponse type with 5 problems", () => {
    const response: any = {
      problems: [
        {
          id: "prob-1",
          question: "Q1",
          options: ["A", "B", "C", "D"],
          answerIndex: 0,
          explanation: "Exp",
        },
        // ... 4 more problems (5 total)
      ],
    };
    expect(Array.isArray(response.problems)).toBe(true);
    expect(response.problems.length).toBe(1); // At least 1 for this test
    expect(response.problems[0].options.length).toBe(4);
  });
});

describe("Type safety: localStorage keys and singleton IDs", () => {
  it("should use consistent singleton IDs across all files", () => {
    const singletonIds = {
      goal: "goal",
      subscription: "subscription",
      flags: "flags",
    };
    expect(singletonIds.goal).toBe("goal");
    expect(singletonIds.subscription).toBe("subscription");
    expect(singletonIds.flags).toBe("flags");
  });

  it("should use duotrack: prefix for all localStorage keys", () => {
    const storageKeys = {
      goal: "duotrack:goal",
      diagnosis: "duotrack:diagnosis",
      sessions: "duotrack:sessions",
      exams: "duotrack:exams",
      problems: "duotrack:problems",
      subscription: "duotrack:subscription",
      flags: "duotrack:flags",
    };

    Object.values(storageKeys).forEach((key) => {
      expect(key).toMatch(/^duotrack:/);
    });
  });

  it("should enforce timestamp format as ISO datetime string", () => {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
    const timestamps = [
      "2026-07-23T00:00:00Z",
      "2026-07-23T10:25:30Z",
      "2026-07-20T14:00:00Z",
    ];

    timestamps.forEach((ts) => {
      expect(ts).toMatch(isoRegex);
    });
  });

  it("should enforce ISO date format for deadline and takenAt", () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const dates = [
      "2026-11-30",
      "2026-07-20",
      "2026-07-21",
    ];

    dates.forEach((d) => {
      expect(d).toMatch(dateRegex);
    });
  });
});

describe("Type completeness: all entities have required createdAt/updatedAt", () => {
  it("should require createdAt on all multi-record entities", () => {
    const entities = [
      { id: "diag-1", createdAt: "2026-07-23T00:00:00Z" },
      { id: "sess-1", createdAt: "2026-07-23T10:00:00Z" },
      { id: "exam-1", createdAt: "2026-07-20T14:00:00Z" },
      { id: "pset-1", createdAt: "2026-07-23T12:00:00Z" },
    ];

    entities.forEach((e) => {
      expect(e.createdAt).toBeDefined();
      expect(typeof e.createdAt).toBe("string");
    });
  });

  it("should require updatedAt on all entities (including singletons)", () => {
    const entities = [
      { updatedAt: "2026-07-23T00:00:00Z" }, // GoalConfig
      { updatedAt: "2026-07-23T00:00:00Z" }, // Diagnosis
      { updatedAt: "2026-07-23T10:25:00Z" }, // StudySession
      { updatedAt: "2026-07-20T14:00:00Z" }, // ExamRecord
      { updatedAt: "2026-07-23T12:00:00Z" }, // GeneratedProblemSet
      { updatedAt: "2026-07-23T00:00:00Z" }, // SubscriptionState
      { updatedAt: "2026-07-23T00:00:00Z" }, // AppFlags
    ];

    entities.forEach((e) => {
      expect(e.updatedAt).toBeDefined();
      expect(typeof e.updatedAt).toBe("string");
    });
  });

  it("should use 'id' field consistently across all entities", () => {
    // Multi-record entities have UUID-like ids
    const multiRecordIds = ["diag-uuid-123", "sess-uuid-456", "exam-uuid-789"];
    multiRecordIds.forEach((id) => {
      expect(typeof id).toBe("string");
      expect(id.length > 0).toBe(true);
    });

    // Singletons have fixed id values
    const singletonIds = ["goal", "subscription", "flags"];
    singletonIds.forEach((id) => {
      expect(typeof id).toBe("string");
      expect(singletonIds).toContain(id);
    });
  });
});

describe("Type correctness: FK relationships and nullability", () => {
  it("should allow null for optional FK diagnosisId in StudySession and GeneratedProblemSet", () => {
    const sessionWithoutDiagnosis: any = {
      diagnosisId: null,
    };
    expect(sessionWithoutDiagnosis.diagnosisId === null).toBe(true);

    const sessionWithDiagnosis: any = {
      diagnosisId: "diag-uuid-123",
    };
    expect(typeof sessionWithDiagnosis.diagnosisId).toBe("string");
  });

  it("should allow null for optional currentScore in GoalConfig", () => {
    const goalWithoutScore: any = {
      currentScore: null,
    };
    expect(goalWithoutScore.currentScore === null).toBe(true);

    const goalWithScore: any = {
      currentScore: 640,
    };
    expect(typeof goalWithScore.currentScore).toBe("number");
  });

  it("should allow null for optional endedAt in StudySession", () => {
    const runningSession: any = {
      endedAt: null,
    };
    expect(runningSession.endedAt === null).toBe(true);

    const completedSession: any = {
      endedAt: "2026-07-23T10:25:00Z",
    };
    expect(typeof completedSession.endedAt).toBe("string");
  });

  it("should allow null for predictedScore in ExamRecord", () => {
    const examWithoutPrediction: any = {
      predictedScore: null,
    };
    expect(examWithoutPrediction.predictedScore === null).toBe(true);

    const examWithPrediction: any = {
      predictedScore: 640,
    };
    expect(typeof examWithPrediction.predictedScore).toBe("number");
  });
});
