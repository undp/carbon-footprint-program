import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ListBadgesResponse, ActivateBadgeResponse, DeactivateBadgeResponse, ConfirmBadgeUploadResponse, RequestBadgeUploadResponse } from "@repo/types";
import { apiClient } from "@/api/http/client";
import { badgeKeys } from "./keys";

export const useBadgeCatalog = () =>
  useQuery<ListBadgesResponse>({
    queryKey: badgeKeys.catalog(),
    queryFn: () => apiClient.get("badges").json(),
  });

export const useActivateBadge = () => {
  const queryClient = useQueryClient();
  return useMutation<ActivateBadgeResponse, Error, string>({
    mutationFn: (id) => apiClient.post(`badges/${id}/activate`).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: badgeKeys.catalog() });
    },
  });
};

export const useDeactivateBadge = () => {
  const queryClient = useQueryClient();
  return useMutation<DeactivateBadgeResponse, Error, string>({
    mutationFn: (id) => apiClient.post(`badges/${id}/deactivate`).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: badgeKeys.catalog() });
    },
  });
};

export interface RequestBadgeUploadVariables {
  badgeType: string;
  originalName: string;
}

export const useRequestBadgeUpload = () =>
  useMutation<RequestBadgeUploadResponse, Error, RequestBadgeUploadVariables>({
    mutationFn: ({ badgeType, originalName }) =>
      apiClient
        .post(`files/badge/${badgeType}/request-upload`, { json: { originalName } })
        .json(),
  });

export interface ConfirmBadgeUploadVariables {
  badgeType: string;
  uuid: string;
  originalName: string;
}

export const useConfirmBadgeUpload = () => {
  const queryClient = useQueryClient();
  return useMutation<ConfirmBadgeUploadResponse, Error, ConfirmBadgeUploadVariables>({
    mutationFn: ({ badgeType, uuid, originalName }) =>
      apiClient
        .post(`files/badge/${badgeType}/confirm-upload`, { json: { uuid, originalName } })
        .json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: badgeKeys.catalog() });
    },
  });
};
