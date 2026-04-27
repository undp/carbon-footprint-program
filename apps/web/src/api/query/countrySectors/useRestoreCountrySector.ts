import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RestoreCountrySectorResponse } from "@repo/types";
import { countrySectorKeys } from "./keys";
import { apiClient } from "@/api/http";

export const useRestoreCountrySector = () => {
  const queryClient = useQueryClient();
  return useMutation<RestoreCountrySectorResponse, Error, string>({
    mutationFn: (id) =>
      apiClient.post(`admin/country-sectors/${id}/restore`).json(),
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
