import { useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationKeys } from "./keys";
import { apiClient } from "@/api/http";
import type { RequestOrganizationAccreditationResponse } from "@repo/types";
import { submissionsKeys } from "../submissions";

export const useRequestOrganizationAccreditation = (id: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation<RequestOrganizationAccreditationResponse, Error, string[]>(
    {
      mutationFn: (fileUuids: string[]) =>
        apiClient
          .post(`app/organizations/${id}/request-accreditation`, {
            json: { fileUuids },
          })
          .json<RequestOrganizationAccreditationResponse>(),
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: organizationKeys.all,
            exact: true,
          }),
          queryClient.invalidateQueries({
            queryKey: organizationKeys.detail(id ?? ""),
            exact: true,
          }),
          queryClient.invalidateQueries({
            queryKey: organizationKeys.adminAll(),
            exact: true,
          }),
          queryClient.invalidateQueries({
            queryKey: organizationKeys.adminKpis(),
            exact: true,
          }),
          queryClient.invalidateQueries({
            queryKey: submissionsKeys.organizationHistory(id ?? ""),
          }),
        ]);
      },
    }
  );
};
