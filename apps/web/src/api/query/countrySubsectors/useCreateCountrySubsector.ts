import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateCountrySubsectorRequest,
  CreateCountrySubsectorResponse,
} from "@repo/types";
import { countrySubsectorKeys } from "./keys";
import { countrySectorKeys } from "../countrySectors/keys";
import { apiClient } from "@/api/http";

export const useCreateCountrySubsector = () => {
  const queryClient = useQueryClient();
  return useMutation<
    CreateCountrySubsectorResponse,
    Error,
    CreateCountrySubsectorRequest
  >({
    mutationFn: (body) =>
      apiClient.post("admin/country-subsectors", { json: body }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: countrySubsectorKeys.admin.all,
      });
      // The public sector list embeds subsectors, so invalidate it too.
      void queryClient.invalidateQueries({
        queryKey: countrySectorKeys.app.all,
      });
    },
  });
};
