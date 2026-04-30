import { useQuery } from "@tanstack/react-query";
import { GetAllCountrySectorsResponse } from "@repo/types";
import { countrySectorKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

export const useCountrySectors = () => {
  return useQuery<GetAllCountrySectorsResponse>({
    queryKey: countrySectorKeys.app,
    queryFn: () => apiClient.get("country-sectors").json(),
    staleTime: STALE_TIME_MS,
  });
};
