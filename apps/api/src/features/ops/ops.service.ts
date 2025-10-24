import { getGenerationQueueMetrics } from "@/features/generation/generation.queue";
import { getRasterizationQueueMetrics } from "@/features/uploads/rasterization.queue";
import { prisma } from "@/lib/prisma";

import type { OpsOverviewResponse, OpsRecentErrorDto } from "@quizgen/shared";

const METRICS_WINDOW_HOURS = 24;

const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (value && typeof value === "object" && "valueOf" in value) {
    const numeric = Number((value as { valueOf: () => unknown }).valueOf());
    return Number.isNaN(numeric) ? 0 : numeric;
  }

  return 0;
};

const mapErrors = (records: {
  id: string;
  attemptNo: number;
  errorMessage: string | null;
  createdAt: Date;
  page: { id: string; pageNumber: number; uploadId: string } | null;
}[]): OpsRecentErrorDto[] =>
  records.map((record) => ({
    id: record.id,
    category: "generation",
    message: record.errorMessage ?? "Unknown error",
    occurredAt: record.createdAt.toISOString(),
    pageId: record.page?.id ?? null,
    pageNumber: record.page?.pageNumber ?? null,
    uploadId: record.page?.uploadId ?? null,
    attemptNo: record.attemptNo ?? null,
  }));

export const getOpsOverview = async (): Promise<OpsOverviewResponse> => {
  const windowStart = new Date(Date.now() - METRICS_WINDOW_HOURS * 60 * 60 * 1000);

  const [generationQueue, rasterizationQueue, usageEvents, failedAttempts] = await Promise.all([
    getGenerationQueueMetrics(),
    getRasterizationQueueMetrics(),
    prisma.llmUsageEvent.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { tokensIn: true, tokensOut: true, estimatedCostUsd: true },
    }),
    prisma.pageGenerationAttempt.findMany({
      where: {
        isSuccess: false,
        errorMessage: { not: null },
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        attemptNo: true,
        errorMessage: true,
        createdAt: true,
        page: {
          select: {
            id: true,
            pageNumber: true,
            uploadId: true,
          },
        },
      },
    }),
  ]);

  const usageTotals = usageEvents.reduce(
    (totals, event) => {
      totals.tokensIn += event.tokensIn ?? 0;
      totals.tokensOut += event.tokensOut ?? 0;
      totals.estimatedCostUsd += toNumber(event.estimatedCostUsd);
      totals.eventCount += 1;
      return totals;
    },
    { tokensIn: 0, tokensOut: 0, estimatedCostUsd: 0, eventCount: 0 },
  );

  return {
    generatedAt: new Date().toISOString(),
    queues: [generationQueue, rasterizationQueue],
    llmUsage: {
      windowHours: METRICS_WINDOW_HOURS,
      tokensIn: usageTotals.tokensIn,
      tokensOut: usageTotals.tokensOut,
      estimatedCostUsd: Number(usageTotals.estimatedCostUsd.toFixed(5)),
      eventCount: usageTotals.eventCount,
    },
    recentErrors: mapErrors(failedAttempts),
  };
};
