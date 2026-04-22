import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ActivateBadgeResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { badgeKeys } from "./keys";

export const useActivateBadge = () => {
  const queryClient = useQueryClient();

  return useMutation<ActivateBadgeResponse, Error, string>({
    mutationFn: (id: string) =>
      apiClient.post(`badges/${id}/activate`).json<ActivateBadgeResponse>(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: badgeKeys.catalog() });
    },
  });
};
