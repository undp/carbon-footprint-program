import { organizationKeys } from "./keys";

import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";
import { useQuery } from "@tanstack/react-query";

const MOCK_ORGANIZATIONS = [
  {
    id: "org-123",
    name: "Cementera del Valle",
  },
  {
    id: "org-456",
    name: "Empresa Ejemplo S.A.",
  },
];

//TODO: REPLACE WITH API TYPES
export interface GetAllOrganizationsResponse {
  id: string;
  name: string;
}

export const useOrganizations = () =>
  useQuery<GetAllOrganizationsResponse[]>({
    queryKey: organizationKeys.all,
    // queryFn: () => apiClient.get(`organizations`).json(),
    queryFn: () => Promise.resolve(MOCK_ORGANIZATIONS),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
