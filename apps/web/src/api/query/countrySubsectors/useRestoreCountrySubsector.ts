import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RestoreCountrySubsectorResponse } from "@repo/types";
import { countrySubsectorKeys } from "./keys";
import { countrySectorKeys } from "../countrySectors/keys";
import { apiClient } from "@/api/http";

export const useRestoreCountrySubsector = () => {
  const queryClient = useQueryClient();
  return useMutation<RestoreCountrySubsectorResponse, Error, string>({
    mutationFn: (id) =>
      apiClient.post(`admin/country-subsectors/${id}/restore`).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: countrySubsectorKeys.admin.all,
      });
      void queryClient.invalidateQueries({
        queryKey: countrySectorKeys.app.all,
      });
    },
  });
};
