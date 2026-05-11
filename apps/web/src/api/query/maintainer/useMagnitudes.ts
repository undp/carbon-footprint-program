import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { maintainerKeys } from "./keys";
import { STALE_TIME_MS } from "@/config/constants";
import type {
  GetAllMagnitudesResponse,
  CreateMagnitudeBody,
  CreateMagnitudeResponse,
  UpdateMagnitudeBody,
  UpdateMagnitudeResponse,
} from "@repo/types";

export const useMagnitudes = () =>
  useQuery<GetAllMagnitudesResponse>({
    queryKey: maintainerKeys.magnitudes.all,
    queryFn: () => apiClient.get("magnitudes").json(),
    staleTime: STALE_TIME_MS,
  });

export const useAddMagnitude = () => {
  const queryClient = useQueryClient();
  return useMutation<CreateMagnitudeResponse, Error, CreateMagnitudeBody>({
    mutationFn: (data) => apiClient.post("magnitudes", { json: data }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: maintainerKeys.magnitudes.all,
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: maintainerKeys.measurementUnits.all,
        exact: true,
      });
    },
  });
};

interface UpdateMagnitudeVariables {
  id: string;
  data: UpdateMagnitudeBody;
}

export const useUpdateMagnitude = () => {
  const queryClient = useQueryClient();
  return useMutation<UpdateMagnitudeResponse, Error, UpdateMagnitudeVariables>({
    mutationFn: ({ id, data }) =>
      apiClient.patch(`magnitudes/${id}`, { json: data }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: maintainerKeys.magnitudes.all,
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: maintainerKeys.measurementUnits.all,
        exact: true,
      });
    },
  });
};

export const useDeleteMagnitude = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      apiClient.delete(`magnitudes/${id}`).then(() => undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: maintainerKeys.magnitudes.all,
        exact: true,
      });
    },
  });
};
