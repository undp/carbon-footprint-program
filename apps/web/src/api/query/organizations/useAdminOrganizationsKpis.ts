import { GetOrganizationKpisResponse } from "@repo/types";

const MOCK_DATA: GetOrganizationKpisResponse = {
  total: 156,
  counts: [
    { status: "ACTIVE", accredited: true, withInventories: true, count: 56 },
    { status: "ACTIVE", accredited: true, withInventories: false, count: 36 },
    { status: "ACTIVE", accredited: false, withInventories: true, count: 4 },
    { status: "ACTIVE", accredited: false, withInventories: false, count: 38 },
    { status: "BLOCKED", accredited: true, withInventories: true, count: 8 },
    { status: "BLOCKED", accredited: true, withInventories: false, count: 8 },
    { status: "BLOCKED", accredited: false, withInventories: true, count: 0 },
    { status: "BLOCKED", accredited: false, withInventories: false, count: 6 },
  ],
};

export const useAdminOrganizationsKpis = (): {
  data: GetOrganizationKpisResponse | undefined;
  isLoading: boolean;
} => {
  return {
    data: MOCK_DATA,
    isLoading: false,
  };
  // return useQuery<GetOrganizationKpisResponse>({
  //   queryKey: [...organizationsKeys.adminKpis],
  //   queryFn: () => apiClient.get("/admin/organizations/kpis").json(),
  //   staleTime: STALE_TIME_MS,
  //   refetchInterval: REFETCH_INTERVAL_MS,
  // });
};
