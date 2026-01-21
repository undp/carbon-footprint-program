import { GetMeResponse } from "@repo/types";
import { userKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";
import { useQuery } from "@tanstack/react-query";

export const useMe = () =>
  useQuery<GetMeResponse>({
    queryKey: userKeys.me,
    queryFn: () => apiClient.get(`users/me`).json(),
    staleTime: STALE_TIME_MS,
  });
