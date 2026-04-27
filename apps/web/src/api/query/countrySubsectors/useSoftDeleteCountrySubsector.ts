import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DeleteCountrySubsectorResponse } from "@repo/types";
import { countrySubsectorKeys } from "./keys";
import { countrySectorKeys } from "../countrySectors/keys";
import { apiClient } from "@/api/http";

export const useSoftDeleteCountrySubsector = () => {
  const queryClient = useQueryClient();
  return useMutation<DeleteCountrySubsectorResponse, Error, string>({
    mutationFn: (id) =>
      apiClient.delete(`admin/country-subsectors/${id}`).json(),
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
