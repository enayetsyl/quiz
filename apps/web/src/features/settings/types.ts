export type AppSettings = {
  rpmCap: number;
  workerConcurrency: number;
  queueProvider: string;
  rateLimitSafetyFactor: number;
  tokenEstimateInitial: number;
  apiTokenConfigured: boolean;
  updatedAt: string;
};

export type UpdateSettingsPayload = Partial<{
  rpmCap: number;
  workerConcurrency: number;
  queueProvider: string;
  rateLimitSafetyFactor: number;
  tokenEstimateInitial: number;
}>;

export type RotateTokenResponse = {
  token: string;
};
