import { test, expect } from '@playwright/test';

// nightcrew Sentinel smoke 팩 — Factory 산출(§7.1)
// 핵심 막: 목표 시험(토익/오픽/텝스) 설정 → AI가 현재 실력 진단 후 맞춤 학습 경로 설계, 광고 없는 집중 학습 세션 (25분 포모도로 기반, 중간 알림 없음), 모의 시험 → 실제 시험 점수 입력 → 예측 정확도 및 학습 효율 분석, 취약 파트 자동 감지 + 해당 파트 집중 문제 자동 생성, 학습 투자 대비 점수 향상 ROI 리포트 ('시간당 점수 향상 효율' 시각화)
// 토스 브릿지 의존 구간(로그인·결제)은 외부 재현 불가 — 화면 도달 확인까지만.
const ROUTES = ["/","/Home","/NotFound"];
// WebView 밖 실행에서만 나는 콘솔 에러는 무시(앱인토스 관례 — toss visual-smoke 템플릿 계승)
const IGNORED_CONSOLE = [/SafeAreaInsets/i, /granite/i, /apps-in-toss/i];

for (const route of ROUTES) {
  test(`smoke: ${route} 렌더링과 콘솔 에러 없음`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !IGNORED_CONSOLE.some((re) => re.test(msg.text()))) errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto(route);
    await expect(page.locator('body')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
