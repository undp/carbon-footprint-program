import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateCountrySectorRequest,
  CreateCountrySectorResponse,
} from "@repo/types";
import { countrySectorKeys } from "./keys";
import { apiClient } from "@/api/http";

export const useCreateCountrySector = () => {
  const queryClient = useQueryClient();
  return useMutation<
    CreateCountrySectorResponse,
    Error,
    CreateCountrySectorRequest
  >({
    mutationFn: (body) =>
      apiClient.post("admin/country-sectors", { json: body }).json(),
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
