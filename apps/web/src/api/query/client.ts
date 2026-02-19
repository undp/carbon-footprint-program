import { QueryClient } from "@tanstack/react-query";
import { IS_DEVELOPMENT } from "../../config/environment";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// This code is only for TypeScript
declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: QueryClient;
  }
}

// This code is for all users
if (IS_DEVELOPMENT) {
  window.__TANSTACK_QUERY_CLIENT__ = queryClient;
}
