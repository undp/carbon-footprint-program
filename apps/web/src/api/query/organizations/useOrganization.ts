import { organizationKeys } from "./keys";
import { STALE_TIME_MS } from "@/config/constants";
import { useQuery } from "@tanstack/react-query";
import { GetOrganizationByIdResponse } from "@repo/types";
import { apiClient } from "@/api/http";

export const useOrganization = (id: string | undefined) =>
  useQuery<GetOrganizationByIdResponse>({
    queryKey: organizationKeys.detail(id ?? ""),
    queryFn: async () => apiClient.get(`app/organizations/${id}`).json(),
    staleTime: STALE_TIME_MS,
    enabled: !!id,
  });
