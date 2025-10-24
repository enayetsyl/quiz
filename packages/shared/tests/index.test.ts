import { describe, expect, it } from "vitest";

import { appName, formatDisplayDateTime } from "../src";

describe("@quizgen/shared", () => {
  it("exposes appName constant", () => {
    expect(appName).toBe("NCTB Quiz Generator");
  });

  it("formats date for display", () => {
    const formatted = formatDisplayDateTime(new Date("2024-01-01T12:00:00Z"));
    expect(formatted).toContain("2024");
  });
});

