import { test, expect } from "vitest";
import { scanContent } from "../forbidden-patterns.mjs";

test("hardcoded-hex: 색 맥락 hex 탐지", () => {
  const v = scanContent('const s = { color: "#3182f6" };', "src/x.tsx", { minConfidence: "high" });
  expect(v.some((x) => x.patternId === "hardcoded-hex")).toBe(true);
});
test("hardcoded-hex: CSS 변수는 통과", () => {
  const v = scanContent('const s = { color: "var(--adaptiveBlue500)" };', "src/x.tsx", { minConfidence: "high" });
  expect(v.length).toBe(0);
});
test("gate-allow 마커는 그 줄 면제", () => {
  const v = scanContent('const s = { color: "#3182f6" }; // gate-allow: brand', "src/x.tsx", { minConfidence: "high" });
  expect(v.length).toBe(0);
});
test("granite.config는 hex 제외", () => {
  const v = scanContent('primaryColor: "#3182F6"', "granite.config.ts", { minConfidence: "high" });
  expect(v.length).toBe(0);
});
test("100vh 탐지", () => {
  expect(scanContent("min-height: 100vh;", "src/x.css", { minConfidence: "high" }).length).toBe(1);
});
test("external-nav 탐지", () => {
  expect(scanContent('window.open("https://x")', "src/x.ts", { minConfidence: "high" }).length).toBe(1);
});
test("FixedBottomCTA>Button 중첩 탐지", () => {
  const v = scanContent("<FixedBottomCTA><Button>저장</Button></FixedBottomCTA>", "src/x.tsx", { minConfidence: "high" });
  expect(v.some((x) => x.patternId === "fixedbottomcta-nested-button")).toBe(true);
});
test("FixedBottomCTA children 라벨은 통과", () => {
  const v = scanContent("<FixedBottomCTA onClick={f}>저장</FixedBottomCTA>", "src/x.tsx", { minConfidence: "high" });
  expect(v.length).toBe(0);
});
test("medium 패턴은 high 필터에서 제외", () => {
  const v = scanContent('<TextField variant="box" label="이름" />', "src/x.tsx", { minConfidence: "high" });
  expect(v.length).toBe(0);
});
test("medium 패턴은 전체 스캔에 포함", () => {
  const v = scanContent('<TextField variant="box" label="이름" />', "src/x.tsx");
  expect(v.some((x) => x.patternId === "textfield-no-placeholder")).toBe(true);
});
test("placeholder 있으면 통과", () => {
  const v = scanContent('<TextField variant="box" label="이름" placeholder="예: 홍길동" />', "src/x.tsx");
  expect(v.some((x) => x.patternId === "textfield-no-placeholder")).toBe(false);
});
test("external-nav: window.location.href 탐지", () => {
  expect(scanContent('window.location.href = "https://x";', "src/x.ts", { minConfidence: "high" }).length).toBe(1);
});
test("external-nav: 객체 속성 location은 오탐 안 함", () => {
  expect(scanContent("const u = obj.location.href;", "src/x.ts", { minConfidence: "high" }).length).toBe(0);
});
test("FixedBottomCTA: 별개 블록 + 무관 Button은 오탐 안 함", () => {
  const c = "<FixedBottomCTA onClick={a}>저장</FixedBottomCTA>\n<div><Button>x</Button></div>\n<FixedBottomCTA onClick={b}>취소</FixedBottomCTA>";
  expect(scanContent(c, "src/x.tsx", { minConfidence: "high" }).some((v) => v.patternId === "fixedbottomcta-nested-button")).toBe(false);
});
