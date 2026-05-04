import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import type { GetUserRoleHistoryResponse } from "@repo/types";
import { userKeys } from "./keys";
import { STALE_TIME_MS } from "@/config/constants";

export const useUserRoleHistory = (userId: string) =>
  useQuery<GetUserRoleHistoryResponse>({
    queryKey: userKeys.roleHistory(userId),
    queryFn: () => apiClient.get(`users/${userId}/role-history`).json(),
    staleTime: STALE_TIME_MS,
    enabled: !!userId,
  });
