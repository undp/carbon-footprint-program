import { GetAllUsersResponse } from "@repo/types";
import { userKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";
import { useQuery } from "@tanstack/react-query";

export const useUsers = () =>
  useQuery<GetAllUsersResponse>({
    queryKey: userKeys.users,
    queryFn: () => apiClient.get(`users`).json(),
    staleTime: STALE_TIME_MS,
  });
