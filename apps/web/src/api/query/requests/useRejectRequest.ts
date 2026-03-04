import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RejectRequestBody, RejectRequestResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { requestsKeys } from "./keys.js";
import { organizationsKeys } from "../organizations/keys.js";

export const useRejectRequest = () => {
  const queryClient = useQueryClient();

  return useMutation<
    RejectRequestResponse,
    Error,
    { id: string; body?: RejectRequestBody }
  >({
    mutationFn: ({ id, body }) =>
      apiClient
        // TODO: Remove temporary comment
        // TODO: force 2000 character limit for review comments
        .post(`admin/requests/${id}/reject`, {
          json: body ?? { comments: "temporary comment" },
        })
        .json<RejectRequestResponse>(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: requestsKeys.adminAll }),
        queryClient.invalidateQueries({ queryKey: requestsKeys.adminKpis }),
        queryClient.invalidateQueries({ queryKey: organizationsKeys.adminAll }),
        queryClient.invalidateQueries({
          queryKey: organizationsKeys.adminKpis,
        }),
      ]);
    },
  });
};
