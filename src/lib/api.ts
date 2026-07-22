import type { DiagnoseRequest, DiagnoseResponse } from "@/lib/types";

export type DiagnoseErrorCode = "400" | "401" | "404" | "429" | "500";

export type PostDiagnoseResult =
  | { ok: true; data: DiagnoseResponse; code?: undefined }
  | { ok: false; code: DiagnoseErrorCode; data?: undefined };

const KNOWN_ERROR_STATUSES: ReadonlySet<number> = new Set([400, 401, 404, 429, 500]);

function getSessionId(): string | null {
  try {
    return localStorage.getItem("session-id");
  } catch {
    return null;
  }
}

export async function postDiagnose(req: DiagnoseRequest): Promise<PostDiagnoseResult> {
  try {
    const base = import.meta.env.VITE_AI_API_BASE ?? "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const sessionId = getSessionId();
    if (sessionId) {
      headers["X-Toss-Session"] = sessionId;
    }

    const response = await fetch(`${base}/diagnose`, {
      method: "POST",
      headers,
      body: JSON.stringify(req),
    });

    if (response.ok) {
      const data = (await response.json()) as DiagnoseResponse;
      return { ok: true, data };
    }

    const code: DiagnoseErrorCode = KNOWN_ERROR_STATUSES.has(response.status)
      ? (String(response.status) as DiagnoseErrorCode)
      : "500";
    return { ok: false, code };
  } catch {
    return { ok: false, code: "500" };
  }
}
