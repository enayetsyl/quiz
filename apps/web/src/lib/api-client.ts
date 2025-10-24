import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  isAxiosError
} from "axios";

import type { ApiErrorResponse, ApiResponse } from "@quizgen/shared";

import { toast } from "@/lib/toast";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";

type ToastableConfig = {
  withSuccessToast?: boolean | string;
  successToastMessage?: string;
  withErrorToast?: boolean;
};

export type QuizgenAxiosRequestConfig<TData = unknown> = AxiosRequestConfig<TData> &
  ToastableConfig;

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json"
  }
});

apiClient.interceptors.response.use(
  (response: AxiosResponse<unknown>) => {
    const typedResponse = response as AxiosResponse<ApiResponse<unknown>>;
    const config = typedResponse.config as ToastableConfig | undefined;
    const shouldShowSuccessToast = config?.withSuccessToast;

    if (shouldShowSuccessToast) {
      const customMessage =
        typeof shouldShowSuccessToast === "string"
          ? shouldShowSuccessToast
          : config?.successToastMessage ?? typedResponse.data.message ?? "Request successful";
      toast.success(customMessage);
    }

    return typedResponse;
  },
  (error: unknown) => {
    const axiosError = isAxiosError<ApiErrorResponse>(error) ? error : undefined;
    const config = (axiosError?.config as ToastableConfig | undefined) ?? undefined;
    const shouldShowErrorToast = config?.withErrorToast ?? true;

    if (shouldShowErrorToast) {
      let message = "Request failed";

      if (axiosError) {
        const data = axiosError.response?.data;
        if (data && typeof data.message === "string") {
          message = data.message;
        } else if (typeof axiosError.message === "string") {
          message = axiosError.message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }

      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export { apiClient };
