import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get,
  },
}));

import { getOpsOverview } from '../features/ops/api/get-ops-overview';

import type { OpsOverviewResponse } from '@quizgen/shared';

describe('getOpsOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests metrics from the ops endpoint', async () => {
    const payload: OpsOverviewResponse = {
      generatedAt: new Date().toISOString(),
      queues: [],
      llmUsage: {
        windowHours: 24,
        tokensIn: 0,
        tokensOut: 0,
        estimatedCostUsd: 0,
        eventCount: 0,
      },
      recentErrors: [],
    };

    get.mockResolvedValue({ data: { success: true, data: payload } });

    const result = await getOpsOverview();

    expect(get).toHaveBeenCalledWith(
      '/ops/overview',
      expect.objectContaining({ withErrorToast: true }),
    );
    expect(result).toEqual(payload);
  });
});
