import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "../app/page";

describe("HomePage", () => {
  it("renders title and link", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: /nctb quiz generator/i })).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/dashboard");
  });
});

