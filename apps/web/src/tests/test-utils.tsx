import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";

type RenderWithProvidersResult = ReturnType<typeof render> & {
  queryClient: QueryClient;
};

export const renderWithProviders = (ui: ReactElement): RenderWithProvidersResult => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  const rendered = render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );

  return { ...rendered, queryClient };
};
