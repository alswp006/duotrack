import { defineConfig, devices } from "@playwright/test";

/**
 * Visual smoke — jsdom 유닛 테스트가 *못 보는* 렌더 버그를 잡는다:
 * 흰 화면, <button> 안에 <button>(무효 HTML), 빈 입력칸(placeholder 없음), 콘솔 에러, 휑한 레이아웃.
 *
 *   npx playwright install chromium   # 최초 1회 (브라우저 다운로드)
 *   npm run test:visual               # 구조 스모크 실행 + e2e/__shots__/ 스크린샷 저장
 *
 * 끝내기 전: test:visual 통과 + e2e/__shots__/*.png 를 직접 열어 자가 리뷰
 * (.claude/rules/visual-review.md 루브릭). 모바일 뷰포트 390×844.
 *
 * 픽셀 베이스라인(toHaveScreenshot)은 OS별로 흔들려 기본에선 쓰지 않는다 — 구조 단언 + 스크린샷
 * 자가 리뷰가 기본 그물이다. 픽셀 회귀가 꼭 필요하면 별도 스펙에서 --update-snapshots로 추가.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:5173",
    viewport: { width: 390, height: 844 },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
