import { useQuery } from "@tanstack/react-query";
import type { GetEmissionFactorYearsResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";
import { useAuthorizationHeader } from "./authHeaders";

/**
 * The footprint years the methodology of this inventory has factors for. Feeds
 * the year selector of step 1, which used to build its options from the current
 * date and so offered years no catalogue covers.
 *
 * No `refetchInterval`: only a maintainer can add a year, and never from this
 * screen.
 */
export const useEmissionFactorYears = (id: string) => {
  const { headers } = useAuthorizationHeader(id);

  return useQuery<GetEmissionFactorYearsResponse>({
    queryKey: [...carbonInventoryKeys.emissionFactorYears(id), headers],
    queryFn: () =>
      apiClient
        .get(`carbon-inventories/${id}/emission-factor-years`, { headers })
        .json(),
    staleTime: STALE_TIME_MS,
    enabled: !!id,
  });
};
