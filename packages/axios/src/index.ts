export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type AxiosRequestConfig<TData = unknown> = {
  url?: string;
  baseURL?: string;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  data?: TData;
  method?: HttpMethod;
  withCredentials?: boolean;
};

export type AxiosResponse<TData = unknown> = {
  data: TData;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: AxiosRequestConfig;
};

export class AxiosError<T = unknown> extends Error {
  public readonly response?: AxiosResponse<T>;
  public readonly config?: AxiosRequestConfig;
  public readonly isAxiosError = true;

  constructor(message: string, options?: { response?: AxiosResponse<T>; config?: AxiosRequestConfig }) {
    super(message);
    this.name = "AxiosError";
    this.response = options?.response;
    this.config = options?.config;
  }
}

type PromiseOrValue<T> = T | Promise<T>;

type Interceptor<T> = {
  onFulfilled: (value: T) => PromiseOrValue<T>;
  onRejected?: (error: unknown) => PromiseOrValue<T>;
};

class InterceptorManager<T> {
  private readonly handlers = new Map<number, Interceptor<T>>();
  private sequence = 0;

  use(onFulfilled: Interceptor<T>["onFulfilled"], onRejected?: Interceptor<T>["onRejected"]) {
    const id = this.sequence++;
    this.handlers.set(id, { onFulfilled, onRejected });
    return id;
  }

  eject(id: number) {
    this.handlers.delete(id);
  }

  async run(value: T): Promise<T> {
    let current = value;
    for (const handler of this.handlers.values()) {
      current = await handler.onFulfilled(current);
    }
    return current;
  }

  async runError(error: unknown): Promise<T> {
    let currentError: unknown = error;
    const reversedHandlers = Array.from(this.handlers.values()).reverse();

    for (const handler of reversedHandlers) {
      if (!handler.onRejected) {
        continue;
      }

      try {
        const result = await handler.onRejected(currentError);
        if (result !== undefined) {
          return result;
        }
      } catch (nextError) {
        currentError = nextError;
      }
    }

    throw currentError;
  }
}

const buildURL = (baseURL: string | undefined, url: string | undefined, params?: Record<string, string | number | boolean>) => {
  const resolved = new URL(url ?? "", baseURL ?? "http://localhost");
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      resolved.searchParams.set(key, String(value));
    });
  }
  return resolved.toString();
};

const mergeHeaders = (
  baseHeaders: Record<string, string> | undefined,
  override: Record<string, string> | undefined
) => ({
  ...(baseHeaders ?? {}),
  ...(override ?? {})
});

const parseResponseBody = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export class AxiosInstance {
  public readonly interceptors = {
    request: new InterceptorManager<AxiosRequestConfig>(),
    response: new InterceptorManager<AxiosResponse<unknown>>()
  };

  constructor(private readonly defaultConfig: AxiosRequestConfig = {}) {}

  async get<TData>(url: string, config: AxiosRequestConfig = {}) {
    return this.request<TData>({ ...config, method: "GET", url });
  }

  async delete<TData>(url: string, config: AxiosRequestConfig = {}) {
    return this.request<TData>({ ...config, method: "DELETE", url });
  }

  async post<TData, TBody = unknown>(url: string, data?: TBody, config: AxiosRequestConfig<TBody> = {}) {
    return this.request<TData>({ ...config, method: "POST", url, data });
  }

  async put<TData, TBody = unknown>(url: string, data?: TBody, config: AxiosRequestConfig<TBody> = {}) {
    return this.request<TData>({ ...config, method: "PUT", url, data });
  }

  async patch<TData, TBody = unknown>(url: string, data?: TBody, config: AxiosRequestConfig<TBody> = {}) {
    return this.request<TData>({ ...config, method: "PATCH", url, data });
  }

  async request<TData>(config: AxiosRequestConfig = {}): Promise<AxiosResponse<TData>> {
    let finalConfig: AxiosRequestConfig = {
      ...this.defaultConfig,
      ...config
    };

    try {
      finalConfig = await this.interceptors.request.run(finalConfig);
    } catch (error) {
      finalConfig = await this.interceptors.request.runError(error);
    }

    const requestUrl = buildURL(finalConfig.baseURL, finalConfig.url, finalConfig.params);

    try {
      const response = await fetch(requestUrl, {
        method: finalConfig.method ?? "GET",
        credentials:
          (finalConfig.withCredentials ?? this.defaultConfig.withCredentials) === true
            ? "include"
            : "same-origin",
        headers: mergeHeaders(this.defaultConfig.headers, finalConfig.headers),
        body:
          finalConfig.method && finalConfig.method !== "GET" && finalConfig.data !== undefined
            ? JSON.stringify(finalConfig.data)
            : undefined
      });

      const data = (await parseResponseBody(response)) as TData;
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      const axiosResponse: AxiosResponse<TData> = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers,
        config: finalConfig
      };

      if (!response.ok) {
        throw new AxiosError("Request failed", { response: axiosResponse, config: finalConfig });
      }

      const transformed = await this.interceptors.response.run(axiosResponse);

      return transformed as AxiosResponse<TData>;
    } catch (error) {
      const axiosError = error instanceof AxiosError
        ? error
        : new AxiosError((error as Error)?.message ?? "Request failed", { config: finalConfig });

      try {
        const maybeResponse = await this.interceptors.response.runError(axiosError);
        return maybeResponse as AxiosResponse<TData>;
      } catch (finalError) {
        throw finalError instanceof Error ? finalError : axiosError;
      }
    }
  }
}

export const create = (config?: AxiosRequestConfig) => new AxiosInstance(config);

export const isAxiosError = <T = unknown>(value: unknown): value is AxiosError<T> =>
  value instanceof AxiosError;

export const axios = {
  create,
  isAxiosError
};

export default axios;
