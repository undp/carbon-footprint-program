import { useQuery } from "@tanstack/react-query";
import { GetSystemParametersResponse, SystemParameterKey } from "@repo/types";
import { systemParameterKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

export const useSystemParameters = (keys: SystemParameterKey[]) => {
  const keysParam = keys.join(",");
  return useQuery<GetSystemParametersResponse>({
    queryKey: systemParameterKeys.byKeys(keysParam),
    queryFn: () =>
      apiClient
        .get("system-parameters", {
          searchParams: { keys: keysParam },
        })
        .json(),
    staleTime: STALE_TIME_MS,
  });
};
