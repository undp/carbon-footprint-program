import { GetAllMeasurementUnitsResponse } from "@repo/types";
import { useQuery } from "@tanstack/react-query";
import { STALE_TIME_MS } from "@/config/constants";
import { apiClient } from "@/api/http";
import { measurementUnitKeys } from "./keys";

export const useMeasurementUnits = () =>
  useQuery<GetAllMeasurementUnitsResponse>({
    queryKey: measurementUnitKeys.allMeasurementUnits,
    queryFn: async () => apiClient.get(`measurement-units`).json(),
    staleTime: STALE_TIME_MS,
  });
