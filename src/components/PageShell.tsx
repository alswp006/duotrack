import type { CSSProperties, ReactNode } from "react";

/**
 * 페이지 SafeArea 래퍼 — 모든 페이지의 최상위 컨테이너.
 * 100dvh(NOT 100vh) + safe-area 패딩 + adaptive 배경을 일관되게 적용한다.
 *
 * Pre-built (재구현 금지): 새 페이지는 이 컴포넌트로 감싸라.
 * 헤더/하단 CTA까지 한 번에 두려면 ScreenScaffold를 쓰라.
 */
export function PageShell({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        paddingTop: "calc(var(--toss-safe-area-top) + 16px)",
        paddingBottom: "calc(var(--toss-safe-area-bottom) + 16px)",
        backgroundColor: "var(--adaptiveBackground)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
