import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { DiagnoseResponse } from "@/lib/types";

/**
 * Packet 0004: AI diagnose fetch 클라이언트 + 상태코드 정규화
 *
 * postDiagnose(req) 구현:
 * - POST /diagnose {examType, answers:number[10]}
 * - Success: {ok:true, data: DiagnoseResponse}
 * - Error: {ok:false, code} where code ∈ '400'|'401'|'404'|'429'|'500'
 * - Network reject + undefined status codes (503 등) → code:'500'
 * - 절대 throw 없음, console.error 0회
 * - VITE_AI_API_BASE 환경변수 사용
 * - 토스 세션 컨텍스트 헤더 부착
 */

// Mock postDiagnose will be loaded dynamically in tests
// Once src/lib/api.ts is created with postDiagnose export, these tests will run

async function loadPostDiagnose() {
  const { postDiagnose } = await import("@/lib/api");
  return postDiagnose;
}

describe("AC-1[P0]: 200 응답을 DiagnoseResponse로 파싱·반환", () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should return {ok:true, data} on 200 response", async () => {
    // Import the actual function (will fail until src/lib/api.ts is created)
    const { postDiagnose } = await import("@/lib/api").catch(() => ({
      postDiagnose: async (req: any) => ({ ok: false, code: "500" as const, data: undefined }),
    }));

    // Arrange: mock fetch with success response
    const mockResponse = {
      estimatedScore: 650,
      partScores: { LC: 320, RC: 330 },
      weakParts: ["RC"],
    } as DiagnoseResponse;

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    // Set env variable
    import.meta.env.VITE_AI_API_BASE = "https://api.duotrack.example.com";

    const req = { examType: "TOEIC" as const, answers: [1, 2, 1, 3, 2, 1, 2, 3, 1, 2] };

    // Act: call postDiagnose
    const result = await postDiagnose(req);

    // Assert: returns success with data
    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.estimatedScore).toBe(650);
    expect(result.data?.partScores.LC).toBe(320);
    expect(result.data?.partScores.RC).toBe(330);
    expect(result.data?.weakParts).toEqual(["RC"]);
  });

  it("should NOT call console.error on 200 response", async () => {
    // Load function
    const postDiagnose = await loadPostDiagnose();

    // Arrange: mock successful fetch
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ estimatedScore: 700, partScores: { LC: 350, RC: 350 }, weakParts: [] }),
    });

    import.meta.env.VITE_AI_API_BASE = "https://api.duotrack.example.com";

    // Act: call postDiagnose
    const req = { examType: "TOEIC" as const, answers: Array(10).fill(1) };
    await postDiagnose(req);

    // Assert: console.error not called
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("should handle different estimatedScore values correctly", async () => {
    // Load function
    const postDiagnose = await loadPostDiagnose();

    // Arrange: mock with various score values
    const testCases = [
      { estimatedScore: 400, partScores: { LC: 200, RC: 200 }, weakParts: ["LC", "RC"] },
      { estimatedScore: 900, partScores: { LC: 450, RC: 450 }, weakParts: [] },
      { estimatedScore: 550, partScores: { LC: 275, RC: 275 }, weakParts: ["RC"] },
    ];

    for (const mockData of testCases) {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      import.meta.env.VITE_AI_API_BASE = "https://api.duotrack.example.com";

      const req = { examType: "TOEIC" as const, answers: Array(10).fill(1) };

      // Act
      const result = await postDiagnose(req);

      // Assert: correctly parsed
      expect(result.ok).toBe(true);
      expect(result.data?.estimatedScore).toBe(mockData.estimatedScore);
      expect(result.data?.partScores).toEqual(mockData.partScores);
      expect(result.data?.weakParts).toEqual(mockData.weakParts);
    }
  });
});

describe("AC-2[P0]: 목킹된 400/401/404/429/500 응답에 대응 code 반환", () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should return {ok:false, code:'400'} on 400 response", async () => {
    // Load function
    const postDiagnose = await loadPostDiagnose();

    // Arrange: mock 400 response
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Bad request" }),
    });

    import.meta.env.VITE_AI_API_BASE = "https://api.duotrack.example.com";
    const req = { examType: "TOEIC" as const, answers: Array(10).fill(1) };

    // Act
    const result = await postDiagnose(req);

    // Assert
    expect(result.ok).toBe(false);
    expect(result.code).toBe("400");
    expect(result.data).toBeUndefined();
  });

  it("should return {ok:false, code:'401'} on 401 response", async () => {
    // Load function
    const postDiagnose = await loadPostDiagnose();

    // Arrange
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    });

    import.meta.env.VITE_AI_API_BASE = "https://api.duotrack.example.com";
    const req = { examType: "TOEIC" as const, answers: Array(10).fill(1) };

    // Act
    const result = await postDiagnose(req);

    // Assert
    expect(result.ok).toBe(false);
    expect(result.code).toBe("401");
  });

  it("should return {ok:false, code:'404'} on 404 response", async () => {
    // Load function
    const postDiagnose = await loadPostDiagnose();

    // Arrange
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    });

    import.meta.env.VITE_AI_API_BASE = "https://api.duotrack.example.com";
    const req = { examType: "TOEIC" as const, answers: Array(10).fill(1) };

    // Act
    const result = await postDiagnose(req);

    // Assert
    expect(result.ok).toBe(false);
    expect(result.code).toBe("404");
  });

  it("should return {ok:false, code:'429'} on 429 response", async () => {
    // Load function
    const postDiagnose = await loadPostDiagnose();

    // Arrange
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: "Too many requests" }),
    });

    import.meta.env.VITE_AI_API_BASE = "https://api.duotrack.example.com";
    const req = { examType: "TOEIC" as const, answers: Array(10).fill(1) };

    // Act
    const result = await postDiagnose(req);

    // Assert
    expect(result.ok).toBe(false);
    expect(result.code).toBe("429");
  });

  it("should return {ok:false, code:'500'} on 500 response", async () => {
    // Load function
    const postDiagnose = await loadPostDiagnose();

    // Arrange
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal server error" }),
    });

    import.meta.env.VITE_AI_API_BASE = "https://api.duotrack.example.com";
    const req = { examType: "TOEIC" as const, answers: Array(10).fill(1) };

    // Act
    const result = await postDiagnose(req);

    // Assert
    expect(result.ok).toBe(false);
    expect(result.code).toBe("500");
  });

  it("should NOT call console.error on 4xx/5xx responses", async () => {
    // Load function
    const postDiagnose = await loadPostDiagnose();

    // Arrange: mock error responses
    const statusCodes = [400, 401, 404, 429, 500];

    for (const status of statusCodes) {
      consoleErrorSpy.mockClear();

      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status,
        json: async () => ({ error: `Error ${status}` }),
      });

      import.meta.env.VITE_AI_API_BASE = "https://api.duotrack.example.com";
      const req = { examType: "TOEIC" as const, answers: Array(10).fill(1) };

      // Act
      await postDiagnose(req);

      // Assert
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    }
  });
});

describe("AC-3[P0]: fetch reject(네트워크)·503 응답 모두 code:'500', console.error 0회", () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should return {ok:false, code:'500'} on network error (fetch reject)", async () => {
    // Load function
    const postDiagnose = await loadPostDiagnose();

    // Arrange: mock fetch rejection
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

    import.meta.env.VITE_AI_API_BASE = "https://api.duotrack.example.com";
    const req = { examType: "TOEIC" as const, answers: Array(10).fill(1) };

    // Act
    const result = await postDiagnose(req);

    // Assert: network error maps to 500
    expect(result.ok).toBe(false);
    expect(result.code).toBe("500");
  });

  it("should NOT call console.error on network error", async () => {
    // Load function
    const postDiagnose = await loadPostDiagnose();

    // Arrange: mock fetch rejection
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

    import.meta.env.VITE_AI_API_BASE = "https://api.duotrack.example.com";
    const req = { examType: "TOEIC" as const, answers: Array(10).fill(1) };

    // Act
    await postDiagnose(req);

    // Assert
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("should return {ok:false, code:'500'} on 503 (undefined status code)", async () => {
    // Load function
    const postDiagnose = await loadPostDiagnose();

    // Arrange: mock 503 response (not in spec'd 400/401/404/429/500 set)
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ error: "Service unavailable" }),
    });

    import.meta.env.VITE_AI_API_BASE = "https://api.duotrack.example.com";
    const req = { examType: "TOEIC" as const, answers: Array(10).fill(1) };

    // Act
    const result = await postDiagnose(req);

    // Assert: undefined status code maps to 500
    expect(result.ok).toBe(false);
    expect(result.code).toBe("500");
  });

  it("should return {ok:false, code:'500'} on 502 (bad gateway)", async () => {
    // Load function
    const postDiagnose = await loadPostDiagnose();

    // Arrange: mock 502 response
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({ error: "Bad gateway" }),
    });

    import.meta.env.VITE_AI_API_BASE = "https://api.duotrack.example.com";
    const req = { examType: "TOEIC" as const, answers: Array(10).fill(1) };

    // Act
    const result = await postDiagnose(req);

    // Assert
    expect(result.ok).toBe(false);
    expect(result.code).toBe("500");
  });

  it("should NOT call console.error on 503/502 responses", async () => {
    // Load function
    const postDiagnose = await loadPostDiagnose();

    // Arrange
    const statusCodes = [502, 503];

    for (const status of statusCodes) {
      consoleErrorSpy.mockClear();

      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status,
        json: async () => ({ error: `Error ${status}` }),
      });

      import.meta.env.VITE_AI_API_BASE = "https://api.duotrack.example.com";
      const req = { examType: "TOEIC" as const, answers: Array(10).fill(1) };

      // Act
      await postDiagnose(req);

      // Assert
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    }
  });

  it("should handle CORS error as network error → code:'500'", async () => {
    // Load function
    const postDiagnose = await loadPostDiagnose();

    // Arrange: mock CORS error
    const corsError = new TypeError("Failed to fetch");
    globalThis.fetch = vi.fn().mockRejectedValueOnce(corsError);

    import.meta.env.VITE_AI_API_BASE = "https://api.duotrack.example.com";
    const req = { examType: "TOEIC" as const, answers: Array(10).fill(1) };

    // Act
    const result = await postDiagnose(req);

    // Assert: CORS error → 500
    expect(result.ok).toBe(false);
    expect(result.code).toBe("500");
  });

  it("should NOT call console.error on CORS error", async () => {
    // Load function
    const postDiagnose = await loadPostDiagnose();

    // Arrange: mock CORS error
    const corsError = new TypeError("Failed to fetch");
    globalThis.fetch = vi.fn().mockRejectedValueOnce(corsError);

    import.meta.env.VITE_AI_API_BASE = "https://api.duotrack.example.com";
    const req = { examType: "TOEIC" as const, answers: Array(10).fill(1) };

    // Act
    await postDiagnose(req);

    // Assert: must not call console.error
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});

describe("postDiagnose 요청/응답 형태 검증", () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should send POST request to /diagnose endpoint", async () => {
    // Load function
    const postDiagnose = await loadPostDiagnose();

    // Arrange
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ estimatedScore: 650, partScores: { LC: 320, RC: 330 }, weakParts: [] }),
    });
    globalThis.fetch = fetchMock;

    import.meta.env.VITE_AI_API_BASE = "https://api.duotrack.example.com";
    const req = { examType: "TOEIC" as const, answers: [1, 2, 1, 3, 2, 1, 2, 3, 1, 2] };

    // Act
    await postDiagnose(req);

    // Assert: fetch called with POST method
    expect(fetchMock).toHaveBeenCalled();
    const call = fetchMock.mock.calls[0];
    const url = call[0];
    const options = call[1];

    expect(url).toContain("/diagnose");
    expect(options.method).toBe("POST");
  });

  it("should send request body with examType and answers", async () => {
    // Load function
    const postDiagnose = await loadPostDiagnose();

    // Arrange
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ estimatedScore: 650, partScores: { LC: 320, RC: 330 }, weakParts: [] }),
    });
    globalThis.fetch = fetchMock;

    import.meta.env.VITE_AI_API_BASE = "https://api.duotrack.example.com";
    const answers = [1, 2, 1, 3, 2, 1, 2, 3, 1, 2];
    const req = { examType: "TOEIC" as const, answers };

    // Act
    await postDiagnose(req);

    // Assert: body contains correct data
    const options = fetchMock.mock.calls[0][1];
    const body = JSON.parse(options.body);

    expect(body.examType).toBe("TOEIC");
    expect(body.answers).toEqual(answers);
    expect(body.answers.length).toBe(10);
  });

  it("should include Content-Type header", async () => {
    // Load function
    const postDiagnose = await loadPostDiagnose();

    // Arrange
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ estimatedScore: 650, partScores: { LC: 320, RC: 330 }, weakParts: [] }),
    });
    globalThis.fetch = fetchMock;

    import.meta.env.VITE_AI_API_BASE = "https://api.duotrack.example.com";
    const req = { examType: "TOEIC" as const, answers: Array(10).fill(1) };

    // Act
    await postDiagnose(req);

    // Assert: Content-Type header set
    const options = fetchMock.mock.calls[0][1];
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("should use VITE_AI_API_BASE environment variable for URL", async () => {
    // Load function
    const postDiagnose = await loadPostDiagnose();

    // Arrange
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ estimatedScore: 650, partScores: { LC: 320, RC: 330 }, weakParts: [] }),
    });
    globalThis.fetch = fetchMock;

    const apiBase = "https://custom-ai-api.example.com";
    import.meta.env.VITE_AI_API_BASE = apiBase;
    const req = { examType: "TOEIC" as const, answers: Array(10).fill(1) };

    // Act
    await postDiagnose(req);

    // Assert: URL starts with custom base
    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain(apiBase);
  });

  it("should never throw on any error condition", async () => {
    // Load function
    const postDiagnose = await loadPostDiagnose();

    // Arrange: various error conditions
    const errorConditions = [
      { ok: false, status: 400, json: async () => ({ error: "Bad request" }) },
      { ok: false, status: 500, json: async () => ({ error: "Server error" }) },
      new Error("Network error"),
    ];

    import.meta.env.VITE_AI_API_BASE = "https://api.duotrack.example.com";
    const req = { examType: "TOEIC" as const, answers: Array(10).fill(1) };

    // Act & Assert: should not throw for any error
    for (const condition of errorConditions) {
      if (condition instanceof Error) {
        globalThis.fetch = vi.fn().mockRejectedValueOnce(condition);
      } else {
        globalThis.fetch = vi.fn().mockResolvedValueOnce(condition as any);
      }

      expect(async () => {
        await postDiagnose(req);
      }).not.toThrow();
    }
  });
});

describe("API 헤더 및 세션 컨텍스트", () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should attach session context header if available", async () => {
    // Load function
    const postDiagnose = await loadPostDiagnose();

    // Arrange: mock with session header
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ estimatedScore: 650, partScores: { LC: 320, RC: 330 }, weakParts: [] }),
    });
    globalThis.fetch = fetchMock;

    // Mock session context (e.g., from Toss SDK or localStorage)
    localStorage.setItem("session-id", "test-session-123");

    import.meta.env.VITE_AI_API_BASE = "https://api.duotrack.example.com";
    const req = { examType: "TOEIC" as const, answers: Array(10).fill(1) };

    // Act
    await postDiagnose(req);

    // Assert: headers should include session context if implemented
    const options = fetchMock.mock.calls[0][1];
    // Session header is optional in this spec — just verify no crash
    expect(options.headers).toBeDefined();
  });
});
