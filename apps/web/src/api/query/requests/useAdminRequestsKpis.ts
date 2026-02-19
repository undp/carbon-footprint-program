// import { useQuery } from "@tanstack/react-query";
// import { GetAllCarbonInventoriesResponse } from "@repo/types";
// import { requestsKeys } from "./keys.js";
// import { apiClient } from "@/api/http";
// import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";
import {
  TaskOutlined,
  AccessTimeOutlined,
  CheckCircleOutlined,
  CancelOutlined,
} from "@mui/icons-material";
import { RequestStatus } from "./useAdminRequests.js";

interface KpiDatum {
  status: RequestStatus | null;
  label: string;
  icon: typeof TaskOutlined;
  value: number;
  color: string;
}

const MOCK_DATA: KpiDatum[] = [
  {
    status: null,
    label: "Total",
    icon: TaskOutlined,
    value: 11,
    color: "#459F90",
  },
  {
    status: RequestStatus.PENDING,
    label: "Pendientes",
    icon: AccessTimeOutlined,
    value: 3,
    color: "#E65100",
  },
  {
    status: RequestStatus.APPROVED,
    label: "Aprobadas",
    icon: CheckCircleOutlined,
    value: 1,
    color: "#004D35",
  },
  {
    status: RequestStatus.REJECTED,
    label: "Rechazadas",
    icon: CancelOutlined,
    value: 1,
    color: "#C62828",
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
