import { useQuery } from "@tanstack/react-query";
import type { GetTransparencyDataResponse } from "@repo/types";
import { transparencyKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

export const useTransparencyData = (year?: number) => {
  return useQuery<GetTransparencyDataResponse>({
    queryKey: transparencyKeys.byYear(year),
    queryFn: () =>
      apiClient
        .get("transparency", {
          searchParams: year ? { year: String(year) } : undefined,
        })
        .json(),
    staleTime: STALE_TIME_MS,
  });
};
