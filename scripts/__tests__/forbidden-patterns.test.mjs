import { test } from "node:test";
import assert from "node:assert/strict";
import { scanContent } from "../forbidden-patterns.mjs";

test("hardcoded-hex: 색 맥락 hex 탐지", () => {
  const v = scanContent('const s = { color: "#3182f6" };', "src/x.tsx", { minConfidence: "high" });
  assert.equal(v.some((x) => x.patternId === "hardcoded-hex"), true);
});
test("hardcoded-hex: CSS 변수는 통과", () => {
  const v = scanContent('const s = { color: "var(--adaptiveBlue500)" };', "src/x.tsx", { minConfidence: "high" });
  assert.equal(v.length, 0);
});
test("gate-allow 마커는 그 줄 면제", () => {
  const v = scanContent('const s = { color: "#3182f6" }; // gate-allow: brand', "src/x.tsx", { minConfidence: "high" });
  assert.equal(v.length, 0);
});
test("granite.config는 hex 제외", () => {
  const v = scanContent('primaryColor: "#3182F6"', "granite.config.ts", { minConfidence: "high" });
  assert.equal(v.length, 0);
});
test("100vh 탐지", () => {
  assert.equal(scanContent("min-height: 100vh;", "src/x.css", { minConfidence: "high" }).length, 1);
});
test("external-nav 탐지", () => {
  assert.equal(scanContent('window.open("https://x")', "src/x.ts", { minConfidence: "high" }).length, 1);
});
test("FixedBottomCTA>Button 중첩 탐지", () => {
  const v = scanContent("<FixedBottomCTA><Button>저장</Button></FixedBottomCTA>", "src/x.tsx", { minConfidence: "high" });
  assert.equal(v.some((x) => x.patternId === "fixedbottomcta-nested-button"), true);
});
test("FixedBottomCTA children 라벨은 통과", () => {
  const v = scanContent("<FixedBottomCTA onClick={f}>저장</FixedBottomCTA>", "src/x.tsx", { minConfidence: "high" });
  assert.equal(v.length, 0);
});
test("medium 패턴은 high 필터에서 제외", () => {
  const v = scanContent('<TextField variant="box" label="이름" />', "src/x.tsx", { minConfidence: "high" });
  assert.equal(v.length, 0);
});
test("medium 패턴은 전체 스캔에 포함", () => {
  const v = scanContent('<TextField variant="box" label="이름" />', "src/x.tsx");
  assert.equal(v.some((x) => x.patternId === "textfield-no-placeholder"), true);
});
test("placeholder 있으면 통과", () => {
  const v = scanContent('<TextField variant="box" label="이름" placeholder="예: 홍길동" />', "src/x.tsx");
  assert.equal(v.some((x) => x.patternId === "textfield-no-placeholder"), false);
});
test("external-nav: window.location.href 탐지", () => {
  assert.equal(scanContent('window.location.href = "https://x";', "src/x.ts", { minConfidence: "high" }).length, 1);
});
test("external-nav: 객체 속성 location은 오탐 안 함", () => {
  assert.equal(scanContent("const u = obj.location.href;", "src/x.ts", { minConfidence: "high" }).length, 0);
});
test("FixedBottomCTA: 별개 블록 + 무관 Button은 오탐 안 함", () => {
  const c = "<FixedBottomCTA onClick={a}>저장</FixedBottomCTA>\n<div><Button>x</Button></div>\n<FixedBottomCTA onClick={b}>취소</FixedBottomCTA>";
  assert.equal(scanContent(c, "src/x.tsx", { minConfidence: "high" }).some((v) => v.patternId === "fixedbottomcta-nested-button"), false);
});
