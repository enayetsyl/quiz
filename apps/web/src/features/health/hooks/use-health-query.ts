import { useQuery } from "@tanstack/react-query";

import { getHealth } from "@/features/health/api/get-health";

const healthQueryKeys = {
  all: ["health"] as const
};

export const useHealthQuery = () =>
  useQuery({
    queryKey: healthQueryKeys.all,
    queryFn: getHealth,
    staleTime: 30_000
  });

export type HealthQueryResult = ReturnType<typeof useHealthQuery>;
