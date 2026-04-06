import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApproveRequestBody, ApproveRequestResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { requestsKeys } from "./keys.js";
import { organizationKeys } from "../organizations/keys.js";
import { submissionsKeys } from "../submissions/key.js";

export const useApproveRequest = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ApproveRequestResponse,
    Error,
    { id: string; body?: ApproveRequestBody }
  >({
    mutationFn: ({ id, body }) =>
      apiClient
        .post(`admin/requests/${id}/approve`, { json: body ?? {} })
        .json<ApproveRequestResponse>(),
    onSuccess: async ({ id }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: requestsKeys.adminAll,
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: requestsKeys.adminKpis,
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
          queryKey: organizationKeys.all,
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: submissionsKeys.carbonInventoryHistory(id),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: submissionsKeys.organizationHistory(id),
          exact: true,
        }),
      ]);
    },
  });
};
