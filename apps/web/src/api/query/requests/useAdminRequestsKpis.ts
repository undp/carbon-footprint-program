// import { useQuery } from "@tanstack/react-query";
// import { GetAdminRequestsKpisResponse } from "@repo/types";
// import { requestsKeys } from "./keys.js";
// import { apiClient } from "@/api/http";
// import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";
import {
  GetAdminRequestsKpisResponse,
  SubmissionStatus as RequestStatus,
  SubmissionSubjectType as RequestType,
} from "@repo/types";

const MOCK_DATA: GetAdminRequestsKpisResponse = {
  total: 25,
  counts: [
    {
      type: RequestType.ORGANIZATION_ACCREDITATION,
      status: RequestStatus.PENDING,
      value: 3,
    },
    {
      type: RequestType.ORGANIZATION_ACCREDITATION,
      status: RequestStatus.APPROVED,
      value: 1,
    },
    {
      type: RequestType.ORGANIZATION_ACCREDITATION,
      status: RequestStatus.REJECTED,
      value: 1,
    },
    {
      type: RequestType.CARBON_INVENTORY_CALCULATION,
      status: RequestStatus.PENDING,
      value: 3,
    },
    {
      type: RequestType.CARBON_INVENTORY_CALCULATION,
      status: RequestStatus.APPROVED,
      value: 1,
    },
    {
      type: RequestType.CARBON_INVENTORY_CALCULATION,
      status: RequestStatus.REJECTED,
      value: 1,
    },
    {
      type: RequestType.CARBON_INVENTORY_VERIFICATION,
      status: RequestStatus.PENDING,
      value: 3,
    },
    {
      type: RequestType.CARBON_INVENTORY_VERIFICATION,
      status: RequestStatus.APPROVED,
      value: 1,
    },
    {
      type: RequestType.CARBON_INVENTORY_VERIFICATION,
      status: RequestStatus.REJECTED,
      value: 1,
    },
    {
      type: RequestType.REDUCTION_PLAN_VERIFICATION,
      status: RequestStatus.PENDING,
      value: 3,
    },
    {
      type: RequestType.REDUCTION_PLAN_VERIFICATION,
      status: RequestStatus.APPROVED,
      value: 1,
    },
    {
      type: RequestType.REDUCTION_PLAN_VERIFICATION,
      status: RequestStatus.REJECTED,
      value: 1,
    },
    {
      type: RequestType.NEUTRALIZATION_PLAN_VERIFICATION,
      status: RequestStatus.PENDING,
      value: 3,
    },
    {
      type: RequestType.NEUTRALIZATION_PLAN_VERIFICATION,
      status: RequestStatus.APPROVED,
      value: 1,
    },
    {
      type: RequestType.NEUTRALIZATION_PLAN_VERIFICATION,
      status: RequestStatus.REJECTED,
      value: 1,
    },
  ],
};

export const useAdminRequestsKpis = (): {
  data: GetAdminRequestsKpisResponse | undefined;
  isLoading: boolean;
} => {
  return {
    data: MOCK_DATA,
    isLoading: false,
  };
  // return useQuery<GetAdminRequestsKpisResponse>({
  //   queryKey: [...requestsKeys.adminKpis],
  //   queryFn: () => apiClient.get("/admin/requests/kpis").json(),
  //   staleTime: STALE_TIME_MS,
  //   refetchInterval: REFETCH_INTERVAL_MS,
  // });
};
