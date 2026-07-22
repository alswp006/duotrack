import type { ReactNode } from "react";
import { Paragraph, Spacing } from "@toss/tds-mobile";
import { Card } from "./Card";

/**
 * 요약 히어로 카드 — 탭 홈/대시보드의 시각적 앵커.
 *
 * Pre-built (재구현 금지): 화면이 휑해 보이는 가장 큰 원인은 '핵심 숫자 앵커 부재'다.
 * 홈/결과 화면 최상단에 핵심 숫자 하나를 크게(t1) 박아 위계를 만든다.
 * 탭-루트(하단 TabBar가 있는 메인 탭)에서는 1차 진입 액션을 하단 고정 CTA가 아니라
 * 이 카드의 action 슬롯(카드 내 버튼)에 둔다 — TabBar와 자리 충돌을 피한다.
 *
 *   <SummaryHero
 *     label="총 부채"
 *     value={<Amount value={15000000} unit="원" typography="t1" />}
 *     caption="2건"
 *     action={<Button variant="fill" display="block" onClick={...}>시뮬레이션 시작</Button>}
 *   />
 */
export function SummaryHero({
  label,
  value,
  caption,
  action,
  ai,
  testId,
}: {
  label: ReactNode;
  /** 보통 <Amount .../> 또는 강조 텍스트(typography t1~t2) */
  value: ReactNode;
  caption?: ReactNode;
  /** 카드 내 1차 진입 버튼(예: <Button display="block">). 탭-루트의 진입 액션. */
  action?: ReactNode;
  /** AI 생성 결과면 true → "AI가 생성한 결과입니다" 라벨 표시(고지 의무) */
  ai?: boolean;
  testId?: string;
}) {
  return (
    <Card testId={testId}>
      <Paragraph.Text typography="st11">{label}</Paragraph.Text>
      <Spacing size={4} />
      {/* value는 자체 typography를 가진다(<Amount typography="t1"/> 또는 Paragraph.Text). 중첩 금지. */}
      {value}
      {caption ? (
        <>
          <Spacing size={4} />
          <Paragraph.Text typography="t6">{caption}</Paragraph.Text>
        </>
      ) : null}
      {action ? (
        <>
          <Spacing size={16} />
          {action}
        </>
      ) : null}
      {ai ? (
        <>
          <Spacing size={8} />
          <Paragraph.Text typography="st13">AI가 생성한 결과입니다</Paragraph.Text>
        </>
      ) : null}
    </Card>
  );
}
