'use client';

import { useQuery } from '@tanstack/react-query';

import { getOpsOverview } from '../api/get-ops-overview';

import type { OpsOverviewResponse } from '@quizgen/shared';

const opsKeys = {
  overview: ['ops', 'overview'] as const,
};

export const useOpsOverviewQuery = () =>
  useQuery<OpsOverviewResponse>({
    queryKey: opsKeys.overview,
    queryFn: getOpsOverview,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
