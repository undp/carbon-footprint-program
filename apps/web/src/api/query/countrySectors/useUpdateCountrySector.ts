import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateCountrySectorRequest,
  UpdateCountrySectorResponse,
} from "@repo/types";
import { countrySectorKeys } from "./keys";
import { apiClient } from "@/api/http";

export const useUpdateCountrySector = () => {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateCountrySectorResponse,
    Error,
    { id: string; body: UpdateCountrySectorRequest }
  >({
    mutationFn: ({ id, body }) =>
      apiClient.patch(`admin/country-sectors/${id}`, { json: body }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: countrySectorKeys.admin.all,
      });
      void queryClient.invalidateQueries({
        queryKey: countrySectorKeys.app.all,
      });
    },
  });
};
