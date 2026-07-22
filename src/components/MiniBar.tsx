/**
 * 미니 진행바 — 0..1 비율을 한 줄로 시각화(상환 진행률, 비중 등). 정보 밀도용.
 *
 * Pre-built (재구현 금지): 카드/행 안에서 숫자에 맥락을 더할 때. 색은 adaptive 토큰만(다크모드 자동).
 */
export function MiniBar({
  ratio,
  height = 8,
  testId,
}: {
  /** 0..1 (범위 밖은 클램프) */
  ratio: number;
  height?: number;
  testId?: string;
}) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <div
      data-testid={testId}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        width: "100%",
        height,
        borderRadius: height,
        backgroundColor: "var(--adaptiveGrey100)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          borderRadius: height,
          backgroundColor: "var(--adaptiveBlue500)",
        }}
      />
    </div>
  );
}
