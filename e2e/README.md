# e2e — 비주얼 검증 (jsdom 유닛 테스트가 못 보는 렌더 버그)

유닛 테스트(vitest+jsdom)는 텍스트/동작만 본다. 흰 화면·`<button>` 중첩·빈 입력칸·휑한 레이아웃은
**실제 브라우저에서만** 드러난다. 이 폴더가 그 그물이다.

```bash
npx playwright install chromium   # 최초 1회 (브라우저 다운로드)
npm run test:visual               # 구조 스모크 + e2e/__shots__/ 스크린샷
```

## 구성

- **`visual-smoke.spec.ts`** — 앱-무관 구조 단언: 흰 화면 / `<button>` 안 `<button>` / 빈 입력칸(placeholder) / 콘솔 에러.
  이 앱에 맞게 `ROUTES`에 핵심 화면을 추가하고, 데이터가 필요하면 `seed()`에서 localStorage를 채워라.
- **끝내기 전 자가 리뷰** — `e2e/__shots__/*.png`를 직접 열어 `.claude/rules/visual-review.md` 루브릭으로 확인
  (빈 박스 / 솔리드 알약 탭 / 부유 CTA / 숫자 앵커 / 빈·로딩 상태).

## (선택) 픽셀 회귀

레이아웃을 픽셀 단위로 고정하려면 별도 스펙에 `expect(page).toHaveScreenshot()`를 추가하고
`npx playwright test --update-snapshots`로 베이스라인을 만든다. 단 베이스라인 PNG는 OS/폰트 렌더에
의존하므로 환경이 바뀌면 재생성이 필요하다. 기본 그물(구조 단언 + 스크린샷 자가 리뷰)이 더 이식성 높다.
