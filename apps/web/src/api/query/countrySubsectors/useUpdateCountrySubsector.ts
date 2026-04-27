import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateCountrySubsectorRequest,
  UpdateCountrySubsectorResponse,
} from "@repo/types";
import { countrySubsectorKeys } from "./keys";
import { countrySectorKeys } from "../countrySectors/keys";
import { apiClient } from "@/api/http";

export const useUpdateCountrySubsector = () => {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateCountrySubsectorResponse,
    Error,
    { id: string; body: UpdateCountrySubsectorRequest }
  >({
    mutationFn: ({ id, body }) =>
      apiClient.patch(`admin/country-subsectors/${id}`, { json: body }).json(),
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
