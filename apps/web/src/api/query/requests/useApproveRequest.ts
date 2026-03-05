import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApproveRequestBody, ApproveRequestResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { requestsKeys } from "./keys.js";
import { organizationKeys } from "../organizations/keys.js";

export const useApproveRequest = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ApproveRequestResponse,
    Error,
    { id: string; body?: ApproveRequestBody }
  >({
    mutationFn: ({ id, body }) =>
      // TODO: force 2000 character limit for review comments
      apiClient
        .post(`admin/requests/${id}/approve`, { json: body ?? {} })
        .json<ApproveRequestResponse>(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: requestsKeys.adminAll }),
        queryClient.invalidateQueries({ queryKey: requestsKeys.adminKpis }),
        queryClient.invalidateQueries({
          queryKey: organizationKeys.adminAll(),
        }),
        queryClient.invalidateQueries({
          queryKey: organizationKeys.adminKpis(),
        }),
        queryClient.invalidateQueries({
          queryKey: organizationKeys.all,
        }),
      ]);
    },
  });
};
