import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DeleteCountrySectorResponse } from "@repo/types";
import { countrySectorKeys } from "./keys";
import { countrySubsectorKeys } from "../countrySubsectors/keys";
import { organizationMainActivityKeys } from "../organizationMainActivities/keys";
import { apiClient } from "@/api/http";

export const useSoftDeleteCountrySector = () => {
  const queryClient = useQueryClient();
  return useMutation<DeleteCountrySectorResponse, Error, string>({
    mutationFn: (id) => apiClient.delete(`admin/country-sectors/${id}`).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: countrySectorKeys.admin.all,
      });
      void queryClient.invalidateQueries({
        queryKey: countrySectorKeys.app.all,
      });
      // Cascade soft-delete also affects subsectors and main activities.
      void queryClient.invalidateQueries({
        queryKey: countrySubsectorKeys.all,
      });
      void queryClient.invalidateQueries({
        queryKey: organizationMainActivityKeys.all,
      });
    },
  });
};
