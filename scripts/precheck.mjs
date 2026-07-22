#!/usr/bin/env node
// PreToolUse hook: Write/Edit 콘텐츠에 고신뢰 금지패턴이 있으면 exit 2(쓰기 차단 + stderr를 Claude에).
// 그 외 exit 0. 어떤 예외든 exit 0(fail-open) — 버그난 hook이 세션을 막지 않게.
import { scanContent } from "./forbidden-patterns.mjs";

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

try {
  const payload = JSON.parse(await readStdin());
  const input = payload.tool_input ?? {};
  const file = input.file_path ?? "";
  const content =
    input.content ??
    input.new_string ??
    (Array.isArray(input.edits) ? input.edits.map((e) => e?.new_string ?? "").join("\n") : "");
  if (!file || !content) process.exit(0);

  const violations = scanContent(content, file, { minConfidence: "high" });
  if (violations.length === 0) process.exit(0);

  const lines = violations.map((v) => `  ✗ [${v.patternId}] ${file}:${v.line} — ${v.message}`);
  process.stderr.write(
    `🚫 금지 패턴으로 쓰기를 거부합니다. 고쳐서 다시 쓰세요(정당하면 그 줄에 \`// gate-allow: 사유\`):\n${lines.join("\n")}\n`,
  );
  process.exit(2);
} catch {
  process.exit(0); // fail-open
}
