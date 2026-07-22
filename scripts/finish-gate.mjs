#!/usr/bin/env node
// Stop hook: tsc + 전체 패턴 스캔 + 비주얼 스모크가 통과해야 종료 허용. 하나라도 실패면 exit 2(종료 차단).
// 게이트 인프라 자체 오류는 exit 0(fail-open).
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { scanContent } from "./forbidden-patterns.mjs";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if ([".tsx", ".ts", ".jsx", ".css"].includes(extname(name))) out.push(full);
  }
  return out;
}

function scanSrc(root) {
  const srcDir = join(root, "src");
  if (!existsSync(srcDir)) return [];
  const out = [];
  for (const file of walk(srcDir)) {
    const rel = file.slice(root.length + 1);
    for (const v of scanContent(readFileSync(file, "utf8"), rel)) out.push({ ...v, file: rel });
  }
  return out;
}

function run(cmd) {
  try {
    execSync(cmd, { stdio: "pipe", encoding: "utf8" });
    return { ok: true, out: "" };
  } catch (e) {
    return { ok: false, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
}

try {
  // hook 프로토콜상 stdin이 옴 — 드레인만(내용 불필요)
  try { for await (const _ of process.stdin) { /* drain */ } } catch { /* noop */ }

  const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const failures = [];

  const tsc = run("npx tsc --noEmit");
  if (!tsc.ok) {
    const errs = tsc.out.split("\n").filter((l) => l.includes("error TS")).slice(0, 20).join("\n");
    if (errs) failures.push("■ tsc 에러:\n" + errs);
    else process.stderr.write("⚠️ tsc 실행 불가(인프라 — 미설치/tsconfig 없음) — 타입체크 skip.\n");
  }

  const violations = scanSrc(root);
  if (violations.length) {
    failures.push("■ 금지 패턴:\n" + violations.slice(0, 30).map((v) => `  ✗ [${v.patternId}] ${v.file}:${v.line} — ${v.message}`).join("\n"));
  }

  if (existsSync(join(root, "node_modules", "@playwright", "test"))) {
    const vis = run("npm run test:visual --silent");
    if (!vis.ok) failures.push("■ 비주얼 스모크 실패:\n" + vis.out.split("\n").slice(-25).join("\n"));
  } else {
    process.stderr.write("⚠️ playwright 미설치 — 비주얼 스모크 skip(`npx playwright install chromium` 후 `npm run test:visual`).\n");
  }

  if (failures.length === 0) process.exit(0);
  process.stderr.write("🛑 완료할 수 없습니다 — 아래를 고치고 계속하세요:\n\n" + failures.join("\n\n") + "\n");
  process.exit(2);
} catch {
  process.exit(0); // fail-open
}
