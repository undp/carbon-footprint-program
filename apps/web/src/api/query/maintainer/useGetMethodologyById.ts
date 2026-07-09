import { useQuery } from "@tanstack/react-query";
import type { GetMethodologyByIdResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { maintainerKeys } from "./keys";
import { STALE_TIME_MS } from "@/config/constants";

export const useGetMethodologyById = (id: string | undefined) =>
  useQuery<GetMethodologyByIdResponse>({
    queryKey: maintainerKeys.methodologies.detail(id ?? "none"),
    queryFn: () =>
      apiClient.get(`methodologies/${id}`).json<GetMethodologyByIdResponse>(),
    staleTime: STALE_TIME_MS,
    enabled: id !== undefined,
  });
