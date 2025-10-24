import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";

export type QueryKey = ReadonlyArray<unknown>;

export type QueryFunction<TData> = () => Promise<TData>;

type QueryStatus = "idle" | "loading" | "success" | "error";

type RetryValue = number | boolean;

type QueryBehaviourOptions = {
  staleTime?: number;
  retry?: RetryValue;
  refetchOnWindowFocus?: boolean;
};

type RequiredQueryOptions = {
  staleTime: number;
  retry: number;
  refetchOnWindowFocus: boolean;
};

type QueryOptions<TData> = QueryBehaviourOptions & {
  queryKey: QueryKey;
  queryFn: QueryFunction<TData>;
};

type DefaultMutationOptions = {
  retry?: RetryValue;
};

type DefaultQueryOptions = {
  queries?: QueryBehaviourOptions;
  mutations?: DefaultMutationOptions;
};

export type QueryClientConfig = {
  defaultOptions?: DefaultQueryOptions;
};

type InternalQueryState<TData> = {
  status: QueryStatus;
  data?: TData;
  error?: unknown;
  updatedAt: number;
  listeners: Set<() => void>;
  promise?: Promise<TData>;
  options: RequiredQueryOptions;
};

type QuerySnapshot<TData> = {
  status: QueryStatus;
  data?: TData;
  error?: unknown;
  isFetching: boolean;
  updatedAt: number;
  options: RequiredQueryOptions;
};

const hashKey = (key: QueryKey) => JSON.stringify(key);

const defaultOptions: RequiredQueryOptions = {
  staleTime: 0,
  retry: 0,
  refetchOnWindowFocus: true
};

const resolveRetry = (value: RetryValue | undefined, fallback: number) => {
  if (value === undefined) {
    return fallback;
  }

  if (value === false) {
    return 0;
  }

  if (value === true) {
    return fallback;
  }

  return value;
};

export class QueryClient {
  private readonly cache = new Map<string, InternalQueryState<unknown>>();

  constructor(private readonly config: QueryClientConfig = {}) {}

  private resolveOptions(options?: QueryBehaviourOptions): RequiredQueryOptions {
    const defaults = this.config.defaultOptions?.queries ?? {};
    const fallbackRetry = resolveRetry(defaults.retry, defaultOptions.retry);

    return {
      staleTime: options?.staleTime ?? defaults.staleTime ?? defaultOptions.staleTime,
      retry: resolveRetry(options?.retry, fallbackRetry),
      refetchOnWindowFocus:
        options?.refetchOnWindowFocus ??
        defaults.refetchOnWindowFocus ??
        defaultOptions.refetchOnWindowFocus
    };
  }

  private getOrCreateState<TData>(key: QueryKey, options?: QueryBehaviourOptions) {
    const id = hashKey(key);
    if (!this.cache.has(id)) {
      this.cache.set(id, {
        status: "idle",
        data: undefined,
        error: undefined,
        updatedAt: 0,
        listeners: new Set(),
        promise: undefined,
        options: this.resolveOptions(options)
      });
    }

    const state = this.cache.get(id) as InternalQueryState<TData>;
    state.options = this.resolveOptions({ ...state.options, ...options });
    return state;
  }

  private notify<TData>(state: InternalQueryState<TData>) {
    state.listeners.forEach((listener) => listener());
  }

  subscribe(key: QueryKey, listener: () => void) {
    const state = this.getOrCreateState(key);
    state.listeners.add(listener);
    return () => {
      state.listeners.delete(listener);
    };
  }

  getSnapshot<TData>(key: QueryKey, options?: QueryBehaviourOptions): QuerySnapshot<TData> {
    const state = this.getOrCreateState<TData>(key, options);
    return {
      status: state.status,
      data: state.data,
      error: state.error,
      isFetching: state.promise !== undefined,
      updatedAt: state.updatedAt,
      options: state.options
    };
  }

  async fetchQuery<TData>(
    key: QueryKey,
    queryFn: QueryFunction<TData>,
    options?: QueryBehaviourOptions
  ) {
    const state = this.getOrCreateState<TData>(key, options);

    if (state.promise) {
      return state.promise;
    }

    const execute = async (attempt: number): Promise<TData> => {
      if (state.status === "idle") {
        state.status = "loading";
        this.notify(state);
      }

      try {
        const data = await queryFn();
        state.data = data;
        state.status = "success";
        state.error = undefined;
        state.updatedAt = Date.now();
        this.notify(state);
        return data;
      } catch (error) {
        state.error = error;
        state.status = "error";
        this.notify(state);

        if (attempt < state.options.retry) {
          return execute(attempt + 1);
        }

        throw error;
      }
    };

    const promise = execute(0).finally(() => {
      state.promise = undefined;
      this.notify(state);
    });

    state.promise = promise;
    this.notify(state);

    return promise;
  }
}

const QueryClientContext = createContext<QueryClient | null>(null);

export const QueryClientProvider = ({
  client,
  children
}: PropsWithChildren<{ client: QueryClient }>) => {
  return createElement(QueryClientContext.Provider, { value: client, children });
};

export const useQueryClient = () => {
  const client = useContext(QueryClientContext);
  if (!client) {
    throw new Error("QueryClientProvider is missing in the component tree");
  }
  return client;
};

export type UseQueryResult<TData> = {
  data?: TData;
  error?: unknown;
  isError: boolean;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<TData>;
};

export const useQuery = <TData>(options: QueryOptions<TData>): UseQueryResult<TData> => {
  const client = useQueryClient();
  const { queryKey, queryFn, staleTime, retry, refetchOnWindowFocus } = options;
  const queryOptions = useMemo(
    () => ({ staleTime, retry, refetchOnWindowFocus }),
    [staleTime, retry, refetchOnWindowFocus]
  );
  const [snapshot, setSnapshot] = useState<QuerySnapshot<TData>>(() =>
    client.getSnapshot<TData>(queryKey, queryOptions)
  );
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  useEffect(() =>
    client.subscribe(queryKey, () =>
      setSnapshot(client.getSnapshot<TData>(queryKey, queryOptions))
    ),
  [client, queryKey, queryOptions]);

  useEffect(() => {
    const currentSnapshot = client.getSnapshot<TData>(queryKey, queryOptions);
    const now = Date.now();
    const isStale =
      currentSnapshot.updatedAt === 0 ||
      now - currentSnapshot.updatedAt > currentSnapshot.options.staleTime;

    if (
      currentSnapshot.status === "idle" ||
      (isStale && !currentSnapshot.isFetching)
    ) {
      void client.fetchQuery(queryKey, () => queryFnRef.current(), queryOptions);
    }
  }, [client, queryKey, queryOptions]);

  const refetch = useCallback(
    () => client.fetchQuery(queryKey, () => queryFnRef.current(), queryOptions),
    [client, queryKey, queryOptions]
  );

  useEffect(() => {
    if (typeof window === "undefined" || !snapshot.options.refetchOnWindowFocus) {
      return;
    }

    const handleFocus = () => {
      void refetch();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [refetch, snapshot.options.refetchOnWindowFocus]);

  const isLoading = snapshot.status === "loading" && snapshot.data === undefined;
  const isError = snapshot.status === "error";

  return {
    data: snapshot.data,
    error: snapshot.error,
    isError,
    isLoading,
    isFetching: snapshot.isFetching,
    refetch
  };
};
