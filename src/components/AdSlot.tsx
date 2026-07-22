import { useEffect, useRef } from "react";
import { TossAds } from "@apps-in-toss/web-framework";

interface AdSlotProps {
  /** 광고 그룹 ID — 앱인토스 콘솔에서 발급받아 입력 */
  adGroupId: string;
  className?: string;
  /** 'card' (기본) | 'expanded' */
  variant?: "card" | "expanded";
  /** 'auto' (기본 — 시스템 다크모드 추종) | 'light' | 'dark' */
  theme?: "auto" | "light" | "dark";
}

let tossAdsInitialized = false;

// WebView 밖에서 SDK probe(isSupported)는 false를 "반환"하는 게 아니라 예외를 "던진다".
// 가드하지 않으면 throw가 effect를 탈출 → React 트리 전체 언마운트(첫 화면부터 흰 화면).
function isBannerSupported(): boolean {
  try {
    return TossAds.attachBanner.isSupported?.() === true;
  } catch {
    return false;
  }
}

function ensureInitialized() {
  if (tossAdsInitialized) return;
  try {
    if (!TossAds.initialize.isSupported?.()) return;
    TossAds.initialize({});
    tossAdsInitialized = true;
  } catch {
    /* WebView 밖 — 초기화 스킵 */
  }
}

/**
 * 배너 광고 슬롯 — TossAds.attachBanner의 React 래퍼.
 *
 * SDK는 imperative API: 빈 DOM 노드에 attachBanner(adGroupId, element)를
 * 호출하면 SDK가 해당 노드 안에 배너를 렌더링. cleanup은 result.destroy().
 *
 * 앱인토스 WebView 외 환경(로컬 브라우저, jsdom)에서는 isSupported가 예외를
 * 던지므로 try/catch로 가드 → 조용히 빈 영역 반환(트리 언마운트 방지).
 */
export function AdSlot({ adGroupId, className, variant, theme }: AdSlotProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = containerRef.current;
    if (!target) return;
    if (!isBannerSupported()) return;

    ensureInitialized();

    let result: { destroy: () => void } | null = null;
    try {
      result = TossAds.attachBanner(adGroupId, target, { variant, theme });
    } catch {
      /* SDK unavailable or attach failed — silent */
    }

    return () => {
      try {
        result?.destroy();
      } catch {
        /* cleanup best-effort */
      }
    };
  }, [adGroupId, variant, theme]);

  return <div ref={containerRef} data-ad-group-id={adGroupId} className={className ?? "ad-slot"} />;
}
