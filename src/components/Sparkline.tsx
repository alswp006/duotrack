/**
 * 스파크라인 — 숫자 배열을 경량 인라인 SVG 라인+에어리어로(상환 곡선, 추이 등).
 *
 * Pre-built (재구현 금지): 데이터 시각화가 필요할 때. D3/Three.js 등 무거운 차트 라이브러리는
 * 번들 100MB 제한 + 정책상 금지 → 이 인라인 SVG로 대체한다(의존성 0). 색은 adaptive 토큰만.
 */
export function Sparkline({
  data,
  width = 320,
  height = 64,
  testId,
}: {
  data: number[];
  width?: number;
  height?: number;
  testId?: string;
}) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg
      data-testid={testId}
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="추이 그래프"
    >
      <path d={area} fill="var(--adaptiveBlue500)" opacity={0.12} />
      <path
        d={line}
        fill="none"
        stroke="var(--adaptiveBlue500)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
