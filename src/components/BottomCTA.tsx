import type { ReactNode } from "react";
import { FixedBottomCTA, Button } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";

/**
 * 주요 CTA 햅틱 — 토스 네이티브 감각. SDK는 WebView 밖에서 throw하므로 가드 필수.
 * (이 한 번의 배선으로 거의 모든 1차 CTA가 자동으로 햅틱을 갖게 된다 — prose 규칙보다 강함.)
 */
function fireHaptic(type: "success" | "tickWeak") {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

/**
 * 단일 1차 CTA — 하단 고정. FixedBottomCTA가 safe-area + 하단 그라데이션을 자동 처리한다.
 *
 * Pre-built (재구현 금지): 폼 제출/다음 단계 등 화면의 1차 액션에 사용.
 * ⚠️ FixedBottomCTA는 그 자체가 <button>이다(.d.ts: HTMLButtonElement ref). 안에 또
 *   <Button>을 넣으면 <button><button>(무효 HTML/validateDOMNesting) → children에 라벨을 직접.
 * 탭 루트(하단 TabBar가 있는 메인 탭)에는 쓰지 마라 — 탭바와 겹친다. 그 경우 SummaryHero
 * 카드 내부 진입 버튼을 사용한다(역할 분리). 클릭 시 success 햅틱이 자동 발화된다.
 */
export function SubmitFooter({
  label,
  onClick,
  disabled,
}: {
  label: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <FixedBottomCTA
      onClick={() => {
        fireHaptic("success");
        onClick();
      }}
      disabled={disabled}
    >
      {label}
    </FixedBottomCTA>
  );
}

/**
 * 2개 CTA(1차 fill + 2차 weak) — 하단 고정 + safe-area. FixedBottomCTA는 단일 버튼용이라 별도.
 * 두 버튼 모두 display="block"(전체폭).
 */
export function ButtonStack({
  primary,
  secondary,
}: {
  primary: { label: ReactNode; onClick: () => void; disabled?: boolean };
  secondary?: { label: ReactNode; onClick: () => void };
}) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "12px 16px calc(var(--toss-safe-area-bottom) + 12px)",
        backgroundColor: "var(--adaptiveBackground)",
      }}
    >
      <Button
        variant="fill"
        display="block"
        onClick={() => {
          fireHaptic("success");
          primary.onClick();
        }}
        disabled={primary.disabled}
      >
        {primary.label}
      </Button>
      {secondary && (
        <Button
          variant="weak"
          display="block"
          onClick={() => {
            fireHaptic("tickWeak");
            secondary.onClick();
          }}
        >
          {secondary.label}
        </Button>
      )}
    </div>
  );
}
