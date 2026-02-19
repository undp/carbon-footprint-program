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

interface RequestDatum {
  id: string;
  empresa: string;
  tipo: RequestType;
  periodo: string;
  estado: RequestStatus;
  fechaEnvio: string;
}

const MOCK_DATA: RequestDatum[] = [
  {
    id: "1",
    empresa: "Empresa Demo S.A.",
    tipo: RequestType.CALCULATION_DIPLOMA,
    periodo: "2024",
    estado: RequestStatus.PENDING,
    fechaEnvio: "5 dic 2024",
  },
  {
    id: "2",
    empresa: "Tech Solutions Ltd.",
    tipo: RequestType.CALCULATION_DIPLOMA,
    periodo: "2024",
    estado: RequestStatus.REJECTED,
    fechaEnvio: "10 dic 2024",
  },
  {
    id: "3",
    empresa: "Retail Global Corp.",
    tipo: RequestType.NEUTRALIZATION_SEAL,
    periodo: "2024",
    estado: RequestStatus.REJECTED,
    fechaEnvio: "28 nov 2024",
  },
  {
    id: "4",
    empresa: "Empresa Demo S.A.",
    tipo: RequestType.REDUCTION_SEAL,
    periodo: "2023",
    estado: RequestStatus.APPROVED,
    fechaEnvio: "10 dic 2023",
  },
  {
    id: "5",
    empresa: "Logística Express",
    tipo: RequestType.REDUCTION_SEAL,
    periodo: "2024",
    estado: RequestStatus.REJECTED,
    fechaEnvio: "15 oct 2024",
  },
  {
    id: "6",
    empresa: "Alimentos del Sur",
    tipo: RequestType.CALCULATION_DIPLOMA,
    periodo: "2024",
    estado: RequestStatus.PENDING,
    fechaEnvio: "12 dic 2024",
  },
  {
    id: "7",
    empresa: "Retail Global Corp.",
    tipo: RequestType.VERIFICATION_SEAL,
    periodo: "2024",
    estado: RequestStatus.DRAFT,
    fechaEnvio: "-",
  },
  {
    id: "8",
    empresa: "Tech Solutions Ltd.",
    tipo: RequestType.ORG_ACREDITATION,
    periodo: "2024",
    estado: RequestStatus.PENDING,
    fechaEnvio: "15 dic 2024",
  },
  {
    id: "9",
    empresa: "Logística Express",
    tipo: RequestType.ORG_ACREDITATION,
    periodo: "2024",
    estado: RequestStatus.PENDING,
    fechaEnvio: "14 dic 2024",
  },
  {
    id: "10",
    empresa: "Empresa Demo S.A.",
    tipo: RequestType.ORG_ACREDITATION,
    periodo: "-",
    estado: RequestStatus.PENDING,
    fechaEnvio: "16 dic 2024",
  },
  {
    id: "11",
    empresa: "Alimentos del Sur",
    tipo: RequestType.CALCULATION_DIPLOMA,
    periodo: "2024",
    estado: RequestStatus.APPROVED,
    fechaEnvio: "18 dic 2024",
  },
];

export const useAdminRequests = (): {
  data: RequestDatum[];
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
