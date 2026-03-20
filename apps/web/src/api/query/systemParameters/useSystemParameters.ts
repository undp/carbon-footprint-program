import { useQuery } from "@tanstack/react-query";
import { GetSystemParametersResponse } from "@repo/types";
import { systemParameterKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

export const useSystemParameters = (keys?: string[]) => {
  const keysParam = keys?.join(",");
  return useQuery<GetSystemParametersResponse>({
    queryKey: systemParameterKeys.byKeys(keysParam),
    queryFn: () =>
      apiClient
        .get("system-parameters", {
          searchParams: keysParam ? { keys: keysParam } : undefined,
        })
        .json(),
    staleTime: STALE_TIME_MS,
  });
};
