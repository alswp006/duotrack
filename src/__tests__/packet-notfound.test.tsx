import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import NotFound from "@/pages/NotFound";

mockAll();

describe("NotFound page", () => {
  it("Layout: EmptyState 골격으로 렌더된다", () => {
    renderWithRouter(<NotFound />);
    expect(screen.getByTestId("not-found")).toBeInTheDocument();
  });

  it("안내 문구와 홈 복귀 CTA를 보여준다", () => {
    renderWithRouter(<NotFound />);
    expect(screen.getByText("페이지를 찾을 수 없어요")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /홈으로 가기/ }),
    ).toBeInTheDocument();
  });

  it("CTA 클릭 시 홈('/')으로 이동한다", () => {
    renderWithRouter(<NotFound />);
    screen.getByRole("button", { name: /홈으로 가기/ }).click();
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
