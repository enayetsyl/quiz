import { renderWithProviders } from "./test-utils";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HomePageContent } from "@/features/home/components/home-page-content";

const mockRefetch = vi.fn(() => Promise.resolve({}));

vi.mock("@/features/health/hooks/use-health-query", () => ({
  useHealthQuery: () => ({
    data: {
      status: "ok" as const,
      timestamp: new Date("2024-01-01T00:00:00Z").toISOString(),
      service: "quiz-generator-api",
      info: {
        environment: "test",
        hostname: "localhost"
      }
    },
    isLoading: false,
    isError: false,
    refetch: mockRefetch,
    isFetching: false
  })
}));

describe("HomePageContent", () => {
  it("renders hero section and navigation", () => {
    renderWithProviders(<HomePageContent />);

    expect(
      screen.getByRole("heading", { name: /nctb quiz generator/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard"
    );
    expect(screen.getByText(/setup complete/i)).toBeInTheDocument();
  });
});
