import { beforeEach, describe, expect, it, vi } from "vitest";

const getGenerationQueueMetrics = vi.hoisted(() => vi.fn());
const getRasterizationQueueMetrics = vi.hoisted(() => vi.fn());

vi.mock("../src/features/generation/generation.queue", () => ({
  getGenerationQueueMetrics,
}));

vi.mock("../src/features/uploads/rasterization.queue", () => ({
  getRasterizationQueueMetrics,
}));

const prismaMock = vi.hoisted(() => ({
  llmUsageEvent: {
    findMany: vi.fn(),
  },
  pageGenerationAttempt: {
    findMany: vi.fn(),
  },
}));

vi.mock("../src/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { getOpsOverview } from "../src/features/ops/ops.service";

describe("ops overview service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGenerationQueueMetrics.mockResolvedValue({
      name: "generation",
      waiting: 2,
      active: 1,
      delayed: 0,
      failed: 1,
      completed: 10,
      paused: false,
    });
    getRasterizationQueueMetrics.mockResolvedValue({
      name: "rasterization",
      waiting: 0,
      active: 0,
      delayed: 0,
      failed: 0,
      completed: 8,
      paused: false,
    });
    prismaMock.llmUsageEvent.findMany.mockResolvedValue([
      { tokensIn: 100, tokensOut: 200, estimatedCostUsd: 0.12345 },
      { tokensIn: 50, tokensOut: 75, estimatedCostUsd: 0.045 },
    ]);
    prismaMock.pageGenerationAttempt.findMany.mockResolvedValue([
      {
        id: "attempt-1",
        attemptNo: 2,
        errorMessage: "LLM validation failed",
        createdAt: new Date("2024-01-02T12:00:00Z"),
        page: {
          id: "page-1",
          uploadId: "upload-1",
          pageNumber: 4,
        },
      },
    ]);
  });

  it("aggregates queue metrics, usage totals, and errors", async () => {
    const overview = await getOpsOverview();

    expect(overview.queues).toEqual([
      expect.objectContaining({ name: "generation", waiting: 2, failed: 1 }),
      expect.objectContaining({ name: "rasterization", completed: 8 }),
    ]);
    expect(overview.llmUsage.tokensIn).toBe(150);
    expect(overview.llmUsage.tokensOut).toBe(275);
    expect(overview.llmUsage.estimatedCostUsd).toBeCloseTo(0.16845, 5);
    expect(overview.recentErrors).toHaveLength(1);
    expect(overview.recentErrors[0]).toMatchObject({
      message: "LLM validation failed",
      pageId: "page-1",
      uploadId: "upload-1",
      pageNumber: 4,
    });
    expect(typeof overview.generatedAt).toBe("string");
  });
});
