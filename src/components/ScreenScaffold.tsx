import type { ReactNode } from "react";
import { PageShell } from "./PageShell";

/**
 * 골든 화면 골격 — PageShell + (선택)헤더 슬롯 + 본문(좌우 16px 패딩) + (선택)하단 CTA 슬롯.
 *
 * Pre-built (재구현 금지): 새 페이지는 이 골격으로 시작하라.
 *   <ScreenScaffold
 *     top={<Top title={<Top.TitleParagraph>제목</Top.TitleParagraph>} />}
 *     bottom={<SubmitFooter label="다음" onClick={...} />}
 *   >
 *     ...본문...
 *   </ScreenScaffold>
 *
 * top을 주면 <Top/>이 자체 safe-area를 처리하므로 상단 패딩을 제거한다.
 */
export function ScreenScaffold({
  top,
  children,
  bottom,
}: {
  top?: ReactNode;
  children: ReactNode;
  bottom?: ReactNode;
}) {
  return (
    <PageShell style={top ? { paddingTop: 0 } : undefined}>
      {top}
      <div style={{ padding: "16px 16px 0" }}>{children}</div>
      {bottom}
    </PageShell>
  );
}
