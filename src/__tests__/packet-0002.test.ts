import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getGoal,
  saveGoal,
  getSessions,
  saveSessions,
  getExams,
  saveExams,
  getProblems,
  saveProblems,
  getDiagnosis,
  saveDiagnosis,
} from "@/lib/storage";
import type {
  GoalConfig,
  StudySession,
  ExamRecord,
  GeneratedProblemSet,
  Diagnosis,
  SaveResult,
} from "@/lib/types";

/**
 * Packet 0002: localStorage CRUD 헬퍼
 *
 * duotrack 접두어 key 전용 타입 안전 getter/setter 구현.
 * getter는 파싱 실패 시 기본값 반환.
 * 배열 저장은 상한 초과 시 최오래된 항목 제거.
 * QuotaExceededError는 조용한 롤백({ok:false,reason:'quota'}, console.error 0회).
 * 스키마 위반 시 {ok:false,reason:'invalid'}.
 */

describe("AC-1: getGoal() — 잘못된 JSON 저장 후 기본값 반환 (예외 없음)", () => {
  it("should return null when duotrack:goal contains invalid JSON", () => {
    // Arrange: 유효하지 않은 JSON 저장
    localStorage.setItem("duotrack:goal", '"{invalid"');

    // Act: getGoal should parse and handle error gracefully
    const result = getGoal();

    // Assert: should return null, not throw
    expect(result).toBeNull();
  });

  it("should return null when duotrack:goal key doesn't exist", () => {
    // Arrange: key doesn't exist
    localStorage.removeItem("duotrack:goal");

    // Act: getGoal should return default
    const result = getGoal();

    // Assert: default value is null
    expect(result).toBeNull();
  });

  it("should return valid GoalConfig when duotrack:goal is properly formatted", () => {
    // Arrange: valid JSON
    const validGoal: GoalConfig = {
      id: "goal",
      examType: "TOEIC",
      targetScore: 800,
      currentScore: null,
      deadline: "2026-11-30",
      createdAt: "2026-07-23T00:00:00Z",
      updatedAt: "2026-07-23T00:00:00Z",
    };
    localStorage.setItem("duotrack:goal", JSON.stringify(validGoal));

    // Act: getGoal should parse and return
    const result = getGoal();

    // Assert: should return parsed goal
    expect(result).not.toBeNull();
    expect(result?.id).toBe("goal");
    expect(result?.examType).toBe("TOEIC");
    expect(result?.targetScore).toBe(800);
  });

  it("should handle malformed JSON gracefully (no throw)", () => {
    // Arrange: obviously broken JSON
    localStorage.setItem("duotrack:goal", "{not: valid json}");

    // Act: getGoal should not throw
    expect(() => {
      getGoal();
    }).not.toThrow();

    // Assert: should return null on parse error
    const result = getGoal();
    expect(result).toBeNull();
  });
});

describe("AC-2: saveSessions() — 200건 상태 유지, 최오래된 항목 삭제", () => {
  it("should maintain exactly 200 sessions when saving 201 items", () => {
    // Arrange: 201개 세션 생성 (id: sess-0, sess-1, ..., sess-200)
    const sessions: StudySession[] = Array.from({ length: 201 }, (_, i) => ({
      id: `sess-${i}`,
      goalId: "goal",
      diagnosisId: null,
      startedAt: new Date(Date.now() + i * 1000).toISOString(),
      endedAt: null,
      durationMin: 25,
      elapsedSec: 1500,
      partFocus: "RC",
      examType: "TOEIC" as const,
      completed: false,
      createdAt: new Date(Date.now() + i * 1000).toISOString(),
      updatedAt: new Date(Date.now() + i * 1000).toISOString(),
    }));

    // Act: storage helper should evict oldest on save
    const result = saveSessions(sessions);

    // Assert: save succeeds
    expect(result.ok).toBe(true);

    // Assert: storage contains exactly 200
    const saved = getSessions();
    expect(saved.length).toBe(200);
  });

  it("should evict the oldest session (sess-0) when limit exceeded", () => {
    // Arrange: 201 sessions where sess-0 has earliest startedAt
    const now = Date.now();
    const sessions: StudySession[] = Array.from({ length: 201 }, (_, i) => ({
      id: `sess-${i}`,
      goalId: "goal",
      diagnosisId: null,
      startedAt: new Date(now + i * 1000).toISOString(), // increasing startedAt
      endedAt: null,
      durationMin: 25,
      elapsedSec: 1500,
      partFocus: "RC",
      examType: "TOEIC" as const,
      completed: false,
      createdAt: new Date(now + i * 1000).toISOString(),
      updatedAt: new Date(now + i * 1000).toISOString(),
    }));

    // Act: save 201 sessions
    saveSessions(sessions);

    // Assert: oldest (sess-0) evicted, newest (sess-200) kept
    const saved = getSessions();
    expect(saved.length).toBe(200);
    expect(saved.some((s) => s.id === "sess-0")).toBe(false);
    expect(saved.some((s) => s.id === "sess-200")).toBe(true);
  });

  it("should keep 200 items exactly when at limit", () => {
    // Arrange: exactly 200 sessions
    const sessions: StudySession[] = Array.from({ length: 200 }, (_, i) => ({
      id: `sess-${i}`,
      goalId: "goal",
      diagnosisId: null,
      startedAt: new Date(Date.now() + i * 1000).toISOString(),
      endedAt: null,
      durationMin: 25,
      elapsedSec: 1500,
      partFocus: "RC",
      examType: "TOEIC" as const,
      completed: false,
      createdAt: new Date(Date.now() + i * 1000).toISOString(),
      updatedAt: new Date(Date.now() + i * 1000).toISOString(),
    }));

    // Act: save exactly 200
    const result = saveSessions(sessions);

    // Assert: save succeeds and count remains 200
    expect(result.ok).toBe(true);
    const saved = getSessions();
    expect(saved.length).toBe(200);
  });

  it("should handle empty array without error", () => {
    // Arrange: empty array
    const sessions: StudySession[] = [];

    // Act: save empty
    const result = saveSessions(sessions);

    // Assert: succeeds and remains empty
    expect(result.ok).toBe(true);
    const saved = getSessions();
    expect(saved.length).toBe(0);
  });
});

describe("AC-3a: saveSessions() — QuotaExceededError 처리 (console.error 0회)", () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should return {ok:false,reason:'quota'} when localStorage.setItem throws", () => {
    // Arrange: mock setItem to throw QuotaExceededError
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      const err = new Error("QuotaExceededError");
      err.name = "QuotaExceededError";
      throw err;
    });

    const sessions: StudySession[] = [
      {
        id: "sess-1",
        goalId: "goal",
        diagnosisId: null,
        startedAt: "2026-07-23T10:00:00Z",
        endedAt: null,
        durationMin: 25,
        elapsedSec: 1500,
        partFocus: "RC",
        examType: "TOEIC" as const,
        completed: false,
        createdAt: "2026-07-23T10:00:00Z",
        updatedAt: "2026-07-23T10:00:00Z",
      },
    ];

    // Act: attempt to save with quota error
    const result = saveSessions(sessions);

    // Assert: returns {ok:false,reason:'quota'}
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("quota");

    setItemSpy.mockRestore();
  });

  it("should NOT call console.error when quota error occurs", () => {
    // Arrange: mock setItem to throw
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      const err = new Error("QuotaExceededError");
      err.name = "QuotaExceededError";
      throw err;
    });

    // Act: the helper should catch and NOT console.error
    saveSessions([]);

    // Assert: console.error should not have been called by helper
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    setItemSpy.mockRestore();
  });
});

describe("AC-3b: saveGoal() — 범위 밖 값 검증 {ok:false,reason:'invalid'}", () => {
  it("should reject GoalConfig with invalid examType", () => {
    // Arrange: examType not in ["TOEIC", "OPIC", "TEPS"]
    const invalidGoal: any = {
      id: "goal",
      examType: "INVALID_TYPE",
      targetScore: 800,
      currentScore: null,
      deadline: "2026-11-30",
      createdAt: "2026-07-23T00:00:00Z",
      updatedAt: "2026-07-23T00:00:00Z",
    };

    // Act: attempt to save invalid goal
    const result = saveGoal(invalidGoal);

    // Assert: should return {ok:false,reason:'invalid'}
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid");

    // Assert: should not be stored
    const saved = getGoal();
    expect(saved).toBeNull();
  });

  it("should reject GoalConfig with negative targetScore", () => {
    // Arrange: negative score
    const invalidGoal: any = {
      id: "goal",
      examType: "TOEIC",
      targetScore: -100, // Invalid
      currentScore: null,
      deadline: "2026-11-30",
      createdAt: "2026-07-23T00:00:00Z",
      updatedAt: "2026-07-23T00:00:00Z",
    };

    // Act: attempt to save
    const result = saveGoal(invalidGoal);

    // Assert: should return {ok:false,reason:'invalid'}
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid");

    // Assert: should not be stored
    const saved = getGoal();
    expect(saved).toBeNull();
  });

  it("should reject GoalConfig with invalid deadline format", () => {
    // Arrange: invalid ISO date format
    const invalidGoal: any = {
      id: "goal",
      examType: "TOEIC",
      targetScore: 800,
      currentScore: null,
      deadline: "2026/11/30", // Invalid format
      createdAt: "2026-07-23T00:00:00Z",
      updatedAt: "2026-07-23T00:00:00Z",
    };

    // Act: attempt to save
    const result = saveGoal(invalidGoal);

    // Assert: should return {ok:false,reason:'invalid'}
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid");

    // Assert: should not be stored
    const saved = getGoal();
    expect(saved).toBeNull();
  });

  it("should accept valid GoalConfig", () => {
    // Arrange: fully valid config
    const validGoal: GoalConfig = {
      id: "goal",
      examType: "TOEIC",
      targetScore: 800,
      currentScore: 650,
      deadline: "2026-11-30",
      createdAt: "2026-07-23T00:00:00Z",
      updatedAt: "2026-07-23T00:00:00Z",
    };

    // Act: save valid goal
    const result = saveGoal(validGoal);

    // Assert: should succeed
    expect(result.ok).toBe(true);
    expect(result).not.toHaveProperty("reason");

    // Assert: should be stored correctly
    const saved = getGoal();
    expect(saved).not.toBeNull();
    expect(saved?.id).toBe("goal");
    expect(saved?.examType).toBe("TOEIC");
    expect(saved?.targetScore).toBe(800);
    expect(saved?.currentScore).toBe(650);
  });
});

describe("Array limits: exams (100), problems (20)", () => {
  it("should maintain exactly 100 exams when saving 101 items", () => {
    // Arrange: 101 exam records
    const exams: ExamRecord[] = Array.from({ length: 101 }, (_, i) => ({
      id: `exam-${i}`,
      goalId: "goal",
      predictedFromDiagnosisId: null,
      kind: i % 2 === 0 ? ("mock" as const) : ("real" as const),
      examType: "TOEIC" as const,
      score: 600 + i * 10,
      partScores: { LC: 300, RC: 300 },
      takenAt: "2026-07-23",
      predictedScore: 640,
      createdAt: "2026-07-23T00:00:00Z",
      updatedAt: "2026-07-23T00:00:00Z",
    }));

    // Act: save 101 exams
    const result = saveExams(exams);

    // Assert: succeeds and truncates to 100
    expect(result.ok).toBe(true);
    const saved = getExams();
    expect(saved.length).toBe(100);
  });

  it("should maintain exactly 20 problem sets when saving 21 items", () => {
    // Arrange: 21 problem sets
    const problems: GeneratedProblemSet[] = Array.from({ length: 21 }, (_, i) => ({
      id: `pset-${i}`,
      goalId: "goal",
      diagnosisId: null,
      part: "RC",
      examType: "TOEIC" as const,
      problems: [
        {
          id: `prob-${i}`,
          question: "Question?",
          options: ["A", "B", "C", "D"],
          answerIndex: 0,
          explanation: "Explanation",
        },
      ],
      createdAt: "2026-07-23T00:00:00Z",
      updatedAt: "2026-07-23T00:00:00Z",
      source: "ai" as const,
    }));

    // Act: save 21 problem sets
    const result = saveProblems(problems);

    // Assert: succeeds and truncates to 20
    expect(result.ok).toBe(true);
    const saved = getProblems();
    expect(saved.length).toBe(20);
  });
});

describe("getDiagnosis() — singleton 기본값", () => {
  it("should return null when duotrack:diagnosis key doesn't exist", () => {
    // Arrange: no diagnosis key
    localStorage.removeItem("duotrack:diagnosis");

    // Act: getDiagnosis should return default
    const result = getDiagnosis();

    // Assert: default is null
    expect(result).toBeNull();
  });

  it("should return valid Diagnosis when stored", () => {
    // Arrange: valid diagnosis
    const diagnosis: Diagnosis = {
      id: "diag-123",
      goalId: "goal",
      examType: "TOEIC",
      estimatedScore: 640,
      partScores: { LC: 70, RC: 58 },
      weakParts: ["RC"],
      createdAt: "2026-07-23T00:00:00Z",
      updatedAt: "2026-07-23T00:00:00Z",
      source: "ai",
    };

    // Act: save and retrieve diagnosis
    saveDiagnosis(diagnosis);
    const result = getDiagnosis();

    // Assert: should return parsed diagnosis
    expect(result).not.toBeNull();
    expect(result?.id).toBe("diag-123");
    expect(result?.examType).toBe("TOEIC");
    expect(result?.estimatedScore).toBe(640);
  });

  it("should handle malformed Diagnosis JSON gracefully", () => {
    // Arrange: broken JSON
    localStorage.setItem("duotrack:diagnosis", "{broken json}");

    // Act: getDiagnosis should not throw
    expect(() => {
      getDiagnosis();
    }).not.toThrow();

    // Assert: should return null on parse error
    const result = getDiagnosis();
    expect(result).toBeNull();
  });
});

describe("All helpers use duotrack: prefix", () => {
  it("should use duotrack:goal key for goal storage", () => {
    // Arrange: valid goal
    const goal: GoalConfig = {
      id: "goal",
      examType: "TOEIC",
      targetScore: 800,
      currentScore: null,
      deadline: "2026-11-30",
      createdAt: "2026-07-23T00:00:00Z",
      updatedAt: "2026-07-23T00:00:00Z",
    };

    // Act: save goal
    saveGoal(goal);

    // Assert: stored under duotrack:goal prefix
    const raw = localStorage.getItem("duotrack:goal");
    expect(raw).toBeTruthy();
  });

  it("should use duotrack:sessions key for sessions storage", () => {
    // Arrange: valid sessions
    const sessions: StudySession[] = [
      {
        id: "sess-1",
        goalId: "goal",
        diagnosisId: null,
        startedAt: "2026-07-23T10:00:00Z",
        endedAt: null,
        durationMin: 25,
        elapsedSec: 1500,
        partFocus: "RC",
        examType: "TOEIC" as const,
        completed: false,
        createdAt: "2026-07-23T10:00:00Z",
        updatedAt: "2026-07-23T10:00:00Z",
      },
    ];

    // Act: save sessions
    saveSessions(sessions);

    // Assert: stored under duotrack:sessions prefix
    const raw = localStorage.getItem("duotrack:sessions");
    expect(raw).toBeTruthy();
  });

  it("should use duotrack:exams key for exams storage", () => {
    // Arrange: valid exam
    const exams: ExamRecord[] = [
      {
        id: "exam-1",
        goalId: "goal",
        predictedFromDiagnosisId: null,
        kind: "real",
        examType: "TOEIC" as const,
        score: 720,
        partScores: { LC: 360, RC: 360 },
        takenAt: "2026-07-23",
        predictedScore: 640,
        createdAt: "2026-07-23T00:00:00Z",
        updatedAt: "2026-07-23T00:00:00Z",
      },
    ];

    // Act: save exams
    saveExams(exams);

    // Assert: stored under duotrack:exams prefix
    const raw = localStorage.getItem("duotrack:exams");
    expect(raw).toBeTruthy();
  });

  it("should use duotrack:problems key for problems storage", () => {
    // Arrange: valid problem set
    const problems: GeneratedProblemSet[] = [
      {
        id: "pset-1",
        goalId: "goal",
        diagnosisId: null,
        part: "RC",
        examType: "TOEIC" as const,
        problems: [
          {
            id: "prob-1",
            question: "Question?",
            options: ["A", "B", "C", "D"],
            answerIndex: 0,
            explanation: "Explanation",
          },
        ],
        createdAt: "2026-07-23T00:00:00Z",
        updatedAt: "2026-07-23T00:00:00Z",
        source: "ai" as const,
      },
    ];

    // Act: save problems
    saveProblems(problems);

    // Assert: stored under duotrack:problems prefix
    const raw = localStorage.getItem("duotrack:problems");
    expect(raw).toBeTruthy();
  });

  it("should use duotrack:diagnosis key for diagnosis storage", () => {
    // Arrange: valid diagnosis
    const diagnosis: Diagnosis = {
      id: "diag-1",
      goalId: "goal",
      examType: "TOEIC",
      estimatedScore: 640,
      partScores: { LC: 70, RC: 58 },
      weakParts: ["RC"],
      createdAt: "2026-07-23T00:00:00Z",
      updatedAt: "2026-07-23T00:00:00Z",
      source: "ai",
    };

    // Act: save diagnosis
    saveDiagnosis(diagnosis);

    // Assert: stored under duotrack:diagnosis prefix
    const raw = localStorage.getItem("duotrack:diagnosis");
    expect(raw).toBeTruthy();
  });
});

describe("SaveResult structure — success and failure cases", () => {
  it("should have {ok:true} for successful save", () => {
    const result: SaveResult = { ok: true };
    expect(result.ok).toBe(true);
    expect(result).not.toHaveProperty("reason");
  });

  it("should have {ok:false,reason:'quota'} for quota exceeded", () => {
    const result: SaveResult = { ok: false, reason: "quota" };
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("quota");
  });

  it("should have {ok:false,reason:'invalid'} for schema violation", () => {
    const result: SaveResult = { ok: false, reason: "invalid" };
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid");
  });

  it("should never have both ok:true and reason property", () => {
    const validSuccess: SaveResult = { ok: true };
    expect(validSuccess).not.toHaveProperty("reason");
  });

  it("should always have reason property when ok:false", () => {
    const validFailure1: SaveResult = { ok: false, reason: "quota" };
    const validFailure2: SaveResult = { ok: false, reason: "invalid" };
    expect(validFailure1).toHaveProperty("reason");
    expect(validFailure2).toHaveProperty("reason");
  });
});
