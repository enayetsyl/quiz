export const appName = "NCTB Quiz Generator";

export type ApiSuccessResponse<T> = {
  success: true;
  message: string | null;
  data: T;
  meta: Record<string, unknown> | null;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
  data: unknown | null;
  meta: Record<string, unknown> | null;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type ApiResponsePayload<T> = {
  success: boolean;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
};

export const isApiErrorResponse = <T>(
  response: ApiResponse<T>
): response is ApiErrorResponse => !response.success;

export type HealthCheckResponse = {
  status: "ok";
  timestamp: string;
  service: string;
  info?: Record<string, unknown>;
};

export const formatDisplayDateTime = (
  date: Date,
  locale: string = "en-GB"
): string =>
  new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric"
  }).format(date);

