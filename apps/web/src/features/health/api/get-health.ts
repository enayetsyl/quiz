import { apiClient } from "@/lib/api-client";

import type { ApiSuccessResponse, HealthCheckResponse } from "@quizgen/shared";

export const getHealth = async () => {
  const response = await apiClient.get<ApiSuccessResponse<HealthCheckResponse>>(
    "/health"
  );

  return response.data.data;
};
