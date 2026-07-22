import type { ReactNode } from "react";
import { Paragraph, Spacing, Skeleton } from "@toss/tds-mobile";

/**
 * 빈 상태 — 아이콘(선택) + 제목 + 설명 + 보조(weak) CTA.
 *
 * Pre-built (재구현 금지): 목록/결과가 비었을 때 맨텍스트("데이터 없음") 대신 사용.
 * ⚠️ action은 '보조 액션'이다(variant="weak"). 하단 고정 1차 CTA(SubmitFooter/
 *   FixedBottomCTA)와 같은 라벨·액션을 중복 노출하지 마라(비활성 버튼 중복 = 군더더기).
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  testId,
}: {
  /** Asset.ContentIcon 등(선택) */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** 보조 액션 — <Button variant="weak" .../> 권장. 1차 CTA와 중복 금지. */
  action?: ReactNode;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "48px 24px",
      }}
    >
      {icon}
      {icon ? <Spacing size={12} /> : null}
      <Paragraph.Text typography="t4">{title}</Paragraph.Text>
      {description ? (
        <>
          <Spacing size={4} />
          <Paragraph.Text typography="t6">{description}</Paragraph.Text>
        </>
      ) : null}
      {action ? (
        <>
          <Spacing size={20} />
          {action}
        </>
      ) : null}
    </div>
  );
}

/**
 * 로딩 상태 — TDS Skeleton n줄. 맨텍스트 "불러오는 중" 금지.
 *
 * Pre-built (재구현 금지): 데이터 패칭 중 표시 → 도착 시 실제 컴포넌트로 교체.
 */
export function LoadingState({
  rows = 3,
  testId,
}: {
  rows?: number;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      aria-busy="true"
      style={{ display: "flex", flexDirection: "column", gap: 12, padding: "8px 0" }}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ height: 56 }}>
          <Skeleton />
        </div>
      ))}
    </div>
  );
}
