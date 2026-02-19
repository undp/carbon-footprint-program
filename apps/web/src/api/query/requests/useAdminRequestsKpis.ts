// import { useQuery } from "@tanstack/react-query";
// import { GetAllCarbonInventoriesResponse } from "@repo/types";
// import { requestsKeys } from "./keys.js";
// import { apiClient } from "@/api/http";
// import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";
import { RequestStatus } from "./useAdminRequests.js";

interface KpiDatum {
  status: RequestStatus | null;
  value: number;
}

const MOCK_DATA: KpiDatum[] = [
  {
    status: null,
    value: 11,
  },
  {
    status: RequestStatus.PENDING,
    value: 3,
  },
  {
    status: RequestStatus.APPROVED,
    value: 1,
  },
  {
    status: RequestStatus.REJECTED,
    value: 1,
  },
];

export const useAdminRequestsKpis = (): {
  data: KpiDatum[];
  isLoading: boolean;
} => {
  return {
    data: MOCK_DATA,
    isLoading: false,
  };
  // return useQuery<KpiDatum[]>({
  //   queryKey: [...requestsKeys.adminKpis],
  //   queryFn: () => apiClient.get("/admin/requests/kpis").json(),
  //   staleTime: STALE_TIME_MS,
  //   refetchInterval: REFETCH_INTERVAL_MS,
  // });
};
