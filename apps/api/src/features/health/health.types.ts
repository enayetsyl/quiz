export type HealthCheckResponse = {
  status: "ok";
  timestamp: string;
  service: string;
  info?: Record<string, unknown>;
};

