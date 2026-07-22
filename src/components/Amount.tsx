import type { ComponentProps } from "react";
import { Paragraph } from "@toss/tds-mobile";
import { formatNumber } from "../lib/utils";

type Typography = ComponentProps<typeof Paragraph.Text>["typography"];

/**
 * 금액/지표 1줄 표시 — 좁은 폭에서 숫자-단위가 줄바꿈되는 것을 막는다.
 *
 * Pre-built (재구현 금지): 금액·핵심 숫자는 raw Paragraph.Text 대신 Amount를 써라.
 * - whiteSpace:nowrap → "1,480,861" 과 "원" 이 분리(줄바꿈)되지 않음(CJK 줄바꿈 차단).
 * - tabular-nums → 자릿수 폭 균일(표·비교에서 흔들림 없음).
 * - 콤마 포매팅은 formatNumber(Intl)로 강제(raw 숫자 박기 방지).
 */
export function Amount({
  value,
  unit = "원",
  typography = "t3",
  testId,
}: {
  value: number;
  unit?: string;
  /** Paragraph.Text typography (히어로 숫자는 t1~t2, 인라인 지표는 t3~t4) */
  typography?: Typography;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      style={{
        display: "inline-block",
        maxWidth: "100%",
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <Paragraph.Text typography={typography}>
        {formatNumber(value)}
        {unit}
      </Paragraph.Text>
    </span>
  );
}
