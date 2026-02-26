import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RejectRequestBody, RejectRequestResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { requestsKeys } from "./keys.js";

export const useRejectRequest = () => {
  const queryClient = useQueryClient();

  return useMutation<
    RejectRequestResponse,
    Error,
    { id: string; body?: RejectRequestBody }
  >({
    mutationFn: ({ id, body }) =>
      apiClient.post(`admin/requests/${id}/reject`, { json: body }).json(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: requestsKeys.adminAll }),
        queryClient.invalidateQueries({ queryKey: requestsKeys.adminKpis }),
      ]);
    },
  });
};
