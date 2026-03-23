import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { subcategoryKeys } from "./keys";
import { STALE_TIME_MS } from "@/config/constants";
import type { GetAllSubcategoriesResponse } from "@repo/types";

export const useSubcategories = (methodologyVersionId?: string) =>
  useQuery<GetAllSubcategoriesResponse>({
    queryKey: subcategoryKeys.all(methodologyVersionId ?? "active"),
    queryFn: () =>
      apiClient
        .get("subcategories", {
          searchParams: methodologyVersionId ? { methodologyVersionId } : {},
        })
        .json(),
    staleTime: STALE_TIME_MS,
  });
