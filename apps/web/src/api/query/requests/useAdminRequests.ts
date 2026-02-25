// import { useQuery } from "@tanstack/react-query";
// import { GetAllAdminRequestsResponse } from "@repo/types";
// import { requestsKeys } from "./keys.js";
// import { apiClient } from "@/api/http";
// import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

import {
  GetAllAdminRequestsResponse,
  SubmissionSubjectType as RequestType,
  SubmissionStatus as RequestStatus,
} from "@repo/types";

const MOCK_DATA: GetAllAdminRequestsResponse = [
  {
    id: "1",
    organizationName: "Empresa Demo S.A.",
    type: RequestType.CARBON_INVENTORY_CALCULATION,
    year: 2024,
    status: RequestStatus.PENDING,
    requestedAt: "2024-12-05T00:00:00Z",
  },
  {
    id: "2",
    organizationName: "Tech Solutions Ltd.",
    type: RequestType.CARBON_INVENTORY_CALCULATION,
    year: 2024,
    status: RequestStatus.REJECTED,
    requestedAt: "2024-12-10T00:00:00Z",
  },
  {
    id: "3",
    organizationName: "Retail Global Corp.",
    type: RequestType.NEUTRALIZATION_PLAN_VERIFICATION,
    year: 2024,
    status: RequestStatus.REJECTED,
    requestedAt: "2024-11-28T00:00:00Z",
  },
  {
    id: "4",
    organizationName: "Empresa Demo S.A.",
    type: RequestType.REDUCTION_PLAN_VERIFICATION,
    year: 2023,
    status: RequestStatus.APPROVED,
    requestedAt: "2023-12-10T00:00:00Z",
  },
  {
    id: "5",
    organizationName: "Logística Express",
    type: RequestType.REDUCTION_PLAN_VERIFICATION,
    year: 2024,
    status: RequestStatus.REJECTED,
    requestedAt: "2024-10-15T00:00:00Z",
  },
  {
    id: "6",
    organizationName: "Alimentos del Sur",
    type: RequestType.CARBON_INVENTORY_CALCULATION,
    year: 2024,
    status: RequestStatus.PENDING,
    requestedAt: "2024-12-12T00:00:00Z",
  },
  {
    id: "7",
    organizationName: "Retail Global Corp.",
    type: RequestType.CARBON_INVENTORY_VERIFICATION,
    year: 2024,
    status: RequestStatus.PENDING,
    requestedAt: "2024-12-11T00:00:00Z",
  },
  {
    id: "8",
    organizationName: "Tech Solutions Ltd.",
    type: RequestType.ORGANIZATION_ACCREDITATION,
    year: 2024,
    status: RequestStatus.PENDING,
    requestedAt: "2024-12-15T00:00:00Z",
  },
  {
    id: "9",
    organizationName: "Logística Express",
    type: RequestType.ORGANIZATION_ACCREDITATION,
    year: 2024,
    status: RequestStatus.PENDING,
    requestedAt: "2024-12-14T00:00:00Z",
  },
  {
    id: "10",
    organizationName: "Empresa Demo S.A.",
    type: RequestType.ORGANIZATION_ACCREDITATION,
    year: 2024,
    status: RequestStatus.PENDING,
    requestedAt: "2024-12-16T00:00:00Z",
  },
  {
    id: "11",
    organizationName: "Alimentos del Sur",
    type: RequestType.CARBON_INVENTORY_CALCULATION,
    year: 2024,
    status: RequestStatus.APPROVED,
    requestedAt: "2024-12-18T00:00:00Z",
  },
];

export const useAdminRequests = (): {
  data: GetAllAdminRequestsResponse | undefined;
  isLoading: boolean;
} => {
  return {
    data: MOCK_DATA,
    isLoading: false,
  };
  // return useQuery<GetAllAdminRequestsResponse>({
  //   queryKey: [...requestsKeys.adminAll],
  //   queryFn: () => apiClient.get("/admin/requests").json(),
  //   staleTime: STALE_TIME_MS,
  //   refetchInterval: REFETCH_INTERVAL_MS,
  // });
};
