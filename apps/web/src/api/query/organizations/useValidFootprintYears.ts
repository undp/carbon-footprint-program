import { useQuery } from "@tanstack/react-query";
import type { GetValidFootprintYearsResponse } from "@repo/types";
import { apiClient } from "@/api/http";

export const useValidFootprintYears = (orgId: string | undefined) =>
  useQuery<GetValidFootprintYearsResponse>({
    queryKey: ["organizations", orgId, "validFootprintYears"],
    queryFn: async () =>
      apiClient.get(`app/organizations/${orgId}/valid-footprint-years`).json(),
    enabled: !!orgId,
  });
