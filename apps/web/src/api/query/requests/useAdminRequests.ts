// import { useQuery } from "@tanstack/react-query";
// import { GetAllCarbonInventoriesResponse } from "@repo/types";
// import { requestsKeys } from "./keys.js";
// import { apiClient } from "@/api/http";
// import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export enum RequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  DRAFT = "DRAFT",
}

export enum RequestType {
  ORG_ACREDITATION = "ORG_ACREDITATION",
  CALCULATION_DIPLOMA = "CALCULATION_DIPLOMA",
  VERIFICATION_SEAL = "VERIFICATION_SEAL",
  REDUCTION_SEAL = "REDUCTION_SEAL",
  NEUTRALIZATION_SEAL = "NEUTRALIZATION_SEAL",
}

export interface AdminRequestDatum {
  id: string;
  organizationName: string;
  type: RequestType;
  year: number;
  status: RequestStatus;
  requestedAt: string;
}

const MOCK_DATA: AdminRequestDatum[] = [
  {
    id: "1",
    organizationName: "Empresa Demo S.A.",
    type: RequestType.CALCULATION_DIPLOMA,
    year: 2024,
    status: RequestStatus.PENDING,
    requestedAt: "5 dic 2024",
  },
  {
    id: "2",
    organizationName: "Tech Solutions Ltd.",
    type: RequestType.CALCULATION_DIPLOMA,
    year: 2024,
    status: RequestStatus.REJECTED,
    requestedAt: "10 dic 2024",
  },
  {
    id: "3",
    organizationName: "Retail Global Corp.",
    type: RequestType.NEUTRALIZATION_SEAL,
    year: 2024,
    status: RequestStatus.REJECTED,
    requestedAt: "28 nov 2024",
  },
  {
    id: "4",
    organizationName: "Empresa Demo S.A.",
    type: RequestType.REDUCTION_SEAL,
    year: 2023,
    status: RequestStatus.APPROVED,
    requestedAt: "10 dic 2023",
  },
  {
    id: "5",
    organizationName: "Logística Express",
    type: RequestType.REDUCTION_SEAL,
    year: 2024,
    status: RequestStatus.REJECTED,
    requestedAt: "15 oct 2024",
  },
  {
    id: "6",
    organizationName: "Alimentos del Sur",
    type: RequestType.CALCULATION_DIPLOMA,
    year: 2024,
    status: RequestStatus.PENDING,
    requestedAt: "12 dic 2024",
  },
  {
    id: "7",
    organizationName: "Retail Global Corp.",
    type: RequestType.VERIFICATION_SEAL,
    year: 2024,
    status: RequestStatus.DRAFT,
    requestedAt: "-",
  },
  {
    id: "8",
    organizationName: "Tech Solutions Ltd.",
    type: RequestType.ORG_ACREDITATION,
    year: 2024,
    status: RequestStatus.PENDING,
    requestedAt: "15 dic 2024",
  },
  {
    id: "9",
    organizationName: "Logística Express",
    type: RequestType.ORG_ACREDITATION,
    year: 2024,
    status: RequestStatus.PENDING,
    requestedAt: "14 dic 2024",
  },
  {
    id: "10",
    organizationName: "Empresa Demo S.A.",
    type: RequestType.ORG_ACREDITATION,
    year: 2025,
    status: RequestStatus.PENDING,
    requestedAt: "16 dic 2024",
  },
  {
    id: "11",
    organizationName: "Alimentos del Sur",
    type: RequestType.CALCULATION_DIPLOMA,
    year: 2024,
    status: RequestStatus.APPROVED,
    requestedAt: "18 dic 2024",
  },
];

export const useAdminRequests = (): {
  data: AdminRequestDatum[];
  isLoading: boolean;
} => {
  return {
    data: MOCK_DATA,
    isLoading: false,
  };
  // return useQuery<RequestDatum[]>({
  //   queryKey: [...requestsKeys.adminAll],
  //   queryFn: () => apiClient.get("/admin/requests").json(),
  //   staleTime: STALE_TIME_MS,
  //   refetchInterval: REFETCH_INTERVAL_MS,
  // });
};
