import { useQuery } from "@tanstack/react-query";
import type { GetCurrentTermsConditionsResponse } from "@repo/types";
import { termsConditionsKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

export const useCurrentTermsConditions = () => {
  return useQuery<GetCurrentTermsConditionsResponse>({
    queryKey: termsConditionsKeys.current(),
    queryFn: () => apiClient.get("terms-conditions/current").json(),
    staleTime: STALE_TIME_MS,
  });
};
