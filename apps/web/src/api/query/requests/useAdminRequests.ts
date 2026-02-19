// import { useQuery } from "@tanstack/react-query";
// import { GetAllCarbonInventoriesResponse } from "@repo/types";
// import { requestsKeys } from "./keys.js";
// import { apiClient } from "@/api/http";
// import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export enum RequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum RequestType {
  ORGANIZATION_ACREDITATION = "ORGANIZATION_ACREDITATION",
  CARBON_INVENTORY_CALCULATION = "CARBON_INVENTORY_CALCULATION",
  CARBON_INVENTORY_VERIFICATION = "CARBON_INVENTORY_VERIFICATION",
  REDUCTION_PLAN_VERFICATION = "REDUCTION_PLAN_VERFICATION",
  NEUTRALIZATION_PLAN_VERFICATION = "NEUTRALIZATION_PLAN_VERFICATION",
}

export type AdminRequestsResponse = {
  id: string;
  organizationName: string;
  type: RequestType;
  year: number;
  status: RequestStatus;
  requestedAt: string;
}[];

const MOCK_DATA: AdminRequestsResponse = [
  {
    id: "1",
    organizationName: "Empresa Demo S.A.",
    type: RequestType.CARBON_INVENTORY_CALCULATION,
    year: 2024,
    status: RequestStatus.PENDING,
    requestedAt: "5 dic 2024",
  },
  {
    id: "2",
    organizationName: "Tech Solutions Ltd.",
    type: RequestType.CARBON_INVENTORY_CALCULATION,
    year: 2024,
    status: RequestStatus.REJECTED,
    requestedAt: "10 dic 2024",
  },
  {
    id: "3",
    organizationName: "Retail Global Corp.",
    type: RequestType.NEUTRALIZATION_PLAN_VERFICATION,
    year: 2024,
    status: RequestStatus.REJECTED,
    requestedAt: "28 nov 2024",
  },
  {
    id: "4",
    organizationName: "Empresa Demo S.A.",
    type: RequestType.REDUCTION_PLAN_VERFICATION,
    year: 2023,
    status: RequestStatus.APPROVED,
    requestedAt: "10 dic 2023",
  },
  {
    id: "5",
    organizationName: "Logística Express",
    type: RequestType.REDUCTION_PLAN_VERFICATION,
    year: 2024,
    status: RequestStatus.REJECTED,
    requestedAt: "15 oct 2024",
  },
  {
    id: "6",
    organizationName: "Alimentos del Sur",
    type: RequestType.CARBON_INVENTORY_CALCULATION,
    year: 2024,
    status: RequestStatus.PENDING,
    requestedAt: "12 dic 2024",
  },
  {
    id: "7",
    organizationName: "Retail Global Corp.",
    type: RequestType.CARBON_INVENTORY_VERIFICATION,
    year: 2024,
    status: RequestStatus.PENDING,
    requestedAt: "-",
  },
  {
    id: "8",
    organizationName: "Tech Solutions Ltd.",
    type: RequestType.ORGANIZATION_ACREDITATION,
    year: 2024,
    status: RequestStatus.PENDING,
    requestedAt: "15 dic 2024",
  },
  {
    id: "9",
    organizationName: "Logística Express",
    type: RequestType.ORGANIZATION_ACREDITATION,
    year: 2024,
    status: RequestStatus.PENDING,
    requestedAt: "14 dic 2024",
  },
  {
    id: "10",
    organizationName: "Empresa Demo S.A.",
    type: RequestType.ORGANIZATION_ACREDITATION,
    year: 2025,
    status: RequestStatus.PENDING,
    requestedAt: "16 dic 2024",
  },
  {
    id: "11",
    organizationName: "Alimentos del Sur",
    type: RequestType.CARBON_INVENTORY_CALCULATION,
    year: 2024,
    status: RequestStatus.APPROVED,
    requestedAt: "18 dic 2024",
  },
];

export const useAdminRequests = (): {
  data: AdminRequestsResponse;
  isLoading: boolean;
} => {
  return {
    data: MOCK_DATA,
    isLoading: false,
  };
  // return useQuery<AdminRequestsResponse>({
  //   queryKey: [...requestsKeys.adminAll],
  //   queryFn: () => apiClient.get("/admin/requests").json(),
  //   staleTime: STALE_TIME_MS,
  //   refetchInterval: REFETCH_INTERVAL_MS,
  // });
};
