import { GetAllRateMeasurementUnitsResponse } from "@repo/types";
import { useQuery } from "@tanstack/react-query";
import { STALE_TIME_MS } from "@/config/constants";
import { apiClient } from "@/api/http";
import { measurementUnitKeys } from "./keys";

export const useRateMeasurementUnits = () =>
  useQuery<GetAllRateMeasurementUnitsResponse>({
    queryKey: measurementUnitKeys.allRateMeasurementUnits,
    queryFn: async () => apiClient.get(`measurement-units/rates`).json(),
    staleTime: STALE_TIME_MS,
  });
