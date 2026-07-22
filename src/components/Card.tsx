import type { CSSProperties, ReactNode } from "react";

/**
 * 카드 컨테이너 — adaptive 레이어드 배경 + 16px radius + 16px 패딩.
 *
 * Pre-built (재구현 금지): 핵심 정보(전략 비교, 지표, 결과 등)를 카드로 묶어 위계를 만들 때.
 * 결과/비교 화면은 항목을 맨 <div>로 나열하지 말고 이 Card로 감싸라.
 * 내부 텍스트는 TDS Paragraph.Text(typography)로 위계를 표현(핵심 값은 t2~t3 강조).
 */
export function Card({
  children,
  style,
  testId,
}: {
  children: ReactNode;
  style?: CSSProperties;
  /** 레이아웃 테스트용 data-testid (예: getAllByTestId("strategy-card")) */
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      style={{
        padding: 16,
        borderRadius: 16,
        backgroundColor: "var(--adaptiveLayeredBackground)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
