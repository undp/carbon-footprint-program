import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DeactivateBadgeResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { badgeKeys } from "./keys";

export const useDeactivateBadge = () => {
  const queryClient = useQueryClient();

  return useMutation<DeactivateBadgeResponse, Error, string>({
    mutationFn: (id: string) =>
      apiClient.post(`badges/${id}/deactivate`).json<DeactivateBadgeResponse>(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: badgeKeys.catalog() });
    },
  });
};
