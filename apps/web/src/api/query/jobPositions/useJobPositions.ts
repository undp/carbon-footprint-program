import { GetAllJobPositionsResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { useQuery } from "@tanstack/react-query";
import { jobPositionKeys } from "./keys";
import { STALE_TIME_MS } from "@/config/constants";

export const useJobPositions = () =>
  useQuery<GetAllJobPositionsResponse>({
    queryKey: jobPositionKeys.jobPositions,
    queryFn: () => apiClient.get(`job-positions`).json(),
    staleTime: STALE_TIME_MS,
  });
