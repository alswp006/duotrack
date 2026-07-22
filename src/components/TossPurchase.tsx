import { useRef, useState, useEffect } from "react";
import { IAP } from "@apps-in-toss/web-framework";

/** 결제 성공 결과 (IapCreateOneTimePurchaseOrderResult 일부) */
export interface TossPurchaseResult {
  orderId: string;
  displayName: string;
  displayAmount: string; // 예: "1,000원"
  amount: number;
  currency: string;
}

interface TossPurchaseProps {
  /** 앱인토스 콘솔에 등록한 SKU(상품 고유 ID) */
  sku: string;
  /** 'one-time'(기본) | 'subscription' */
  kind?: "one-time" | "subscription";
  /** 구독 전용 — offerId(무료체험/할인). one-time에서는 무시 */
  offerId?: string;
  /**
   * 주문 생성 후 실제 상품 지급. orderId를 백엔드로 보내 지급 처리한 뒤
   * true(성공)/false(실패)를 반환한다. true여야 결제가 확정된다.
   */
  processProductGrant: (args: { orderId: string; subscriptionId?: string }) => boolean | Promise<boolean>;
  /** 결제 성공 콜백 */
  onPurchased?: (result: TossPurchaseResult) => void;
  /** 결제 실패/취소/미지원 콜백 (에러 코드: USER_CANCELED, INVALID_PRODUCT_ID 등) */
  onError?: (error: unknown) => void;
  /** 버튼 라벨 (기본: "구매하기") */
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * 인앱결제(IAP) 버튼 — IAP.createOneTimePurchaseOrder / createSubscriptionPurchaseOrder
 * 의 React 래퍼.
 *
 * ⚠️ SDK API는 `import { IAP } from "@apps-in-toss/web-framework"` 네임스페이스
 * 아래에 있다(최상위 named export 아님 — 검증된 .d.ts 기준). 각 호출은 cleanup
 * 함수를 반환하므로 언마운트/완료 시 반드시 해제한다.
 *
 * 앱인토스 WebView 밖(로컬 브라우저·jsdom)에서는 호출이 예외를 던질 수 있어
 * AdSlot/TossRewardAd와 동일하게 try/catch로 가드 → 트리 언마운트(흰 화면) 방지,
 * onError로 위임.
 *
 * SKU/offerId는 콘솔 등록값이며, 하드코딩 대신 env(import.meta.env.VITE_TOSS_IAP_SKU)
 * 참조 주입을 권장한다.
 *
 * ```tsx
 * <TossPurchase
 *   sku={import.meta.env.VITE_TOSS_IAP_SKU}
 *   processProductGrant={async ({ orderId }) => grantOnServer(orderId)}
 *   onPurchased={(r) => unlockPremium(r)}
 * >프리미엄 잠금 해제</TossPurchase>
 * ```
 */
export function TossPurchase({
  sku,
  kind = "one-time",
  offerId,
  processProductGrant,
  onPurchased,
  onError,
  children,
  className,
  disabled,
}: TossPurchaseProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const runCleanup = () => {
    try {
      cleanupRef.current?.();
    } catch {
      /* best-effort */
    }
    cleanupRef.current = null;
  };

  // 언마운트 시 진행 중 결제 리소스 해제
  useEffect(() => runCleanup, []);

  const handlePurchase = () => {
    if (isPurchasing) return;
    setIsPurchasing(true);

    const finish = () => {
      setIsPurchasing(false);
      runCleanup();
    };
    const onEvent = (event: { type?: string; data?: TossPurchaseResult }) => {
      if (event?.type === "success" && event.data) onPurchased?.(event.data);
      finish();
    };
    const handleError = (error: unknown) => {
      onError?.(error);
      finish();
    };

    try {
      if (kind === "subscription") {
        cleanupRef.current = IAP.createSubscriptionPurchaseOrder({
          options: { sku, offerId, processProductGrant },
          onEvent,
          onError: handleError,
        });
      } else {
        cleanupRef.current = IAP.createOneTimePurchaseOrder({
          options: { sku, processProductGrant },
          onEvent,
          onError: handleError,
        });
      }
    } catch (e) {
      // SDK 미지원(WebView 밖) 또는 즉시 throw — 트리 붕괴 방지
      handleError(e);
    }
  };

  return (
    <button
      type="button"
      className={className ?? "toss-purchase-button"}
      onClick={handlePurchase}
      disabled={disabled || isPurchasing}
      aria-busy={isPurchasing}
    >
      {isPurchasing ? "결제 진행 중..." : (children ?? "구매하기")}
    </button>
  );
}
