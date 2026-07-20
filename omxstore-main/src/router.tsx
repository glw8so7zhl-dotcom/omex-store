import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Fewer redundant refetches → less network + main-thread work.
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Preload route code + loader data on hover/touch for snappy navigation.
    defaultPreload: "intent",
    // Briefly reuse preloaded loader data instead of always refetching.
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
