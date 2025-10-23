import { describe, expect, it } from "vitest";

import { appName, formatBanglaDate } from "../src";

describe("@quizgen/shared", () => {
  it("exposes appName constant", () => {
    expect(appName).toBe("NCTB Quiz Generator");
  });

  it("formats date in Bangla locale", () => {
    const formatted = formatBanglaDate(new Date("2024-01-01T12:00:00Z"));
    expect(formatted).toContain("২০২৪");
  });
});

