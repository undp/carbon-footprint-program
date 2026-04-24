import { useQuery } from "@tanstack/react-query";
import type { GetAllSubcategoriesResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

const allSubcategoriesKey = ["subcategories", "all"] as const;

export const useAllSubcategories = () =>
  useQuery<GetAllSubcategoriesResponse>({
    queryKey: allSubcategoriesKey,
    queryFn: () => apiClient.get("subcategories").json(),
    staleTime: STALE_TIME_MS,
  });
