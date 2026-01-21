import { GetUserByIdParams } from "@repo/types";
import { userKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";
import { useQuery } from "@tanstack/react-query";

export const useUser = (email: string) =>
  useQuery<GetUserByIdParams>({
    queryKey: userKeys.user(email),
    queryFn: () => apiClient.get(`users/${email}`).json(),
    staleTime: STALE_TIME_MS,
    enabled: !!email,
  });
