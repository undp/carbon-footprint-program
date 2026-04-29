import { useQuery } from "@tanstack/react-query";
import type { GetMethodologyByIdResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

const methodologyByIdKey = (id: string | undefined) =>
  ["methodologies", id ?? "none"] as const;

export const useGetMethodologyById = (id: string | undefined) =>
  useQuery<GetMethodologyByIdResponse>({
    queryKey: methodologyByIdKey(id),
    queryFn: () =>
      apiClient.get(`methodologies/${id}`).json<GetMethodologyByIdResponse>(),
    staleTime: STALE_TIME_MS,
    enabled: id !== undefined,
  });
