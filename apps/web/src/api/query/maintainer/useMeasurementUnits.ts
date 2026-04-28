import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { maintainerKeys } from "./keys";
import { STALE_TIME_MS } from "@/config/constants";
import type {
  GetAllMeasurementUnitsResponse,
  CreateMeasurementUnitBody,
  CreateMeasurementUnitResponse,
  UpdateMeasurementUnitBody,
  UpdateMeasurementUnitResponse,
} from "@repo/types";

export const useMaintainerMeasurementUnits = () =>
  useQuery<GetAllMeasurementUnitsResponse>({
    queryKey: maintainerKeys.measurementUnits.all,
    queryFn: () => apiClient.get("measurement-units").json(),
    staleTime: STALE_TIME_MS,
  });

export const useAddMeasurementUnit = () => {
  const queryClient = useQueryClient();
  return useMutation<
    CreateMeasurementUnitResponse,
    Error,
    CreateMeasurementUnitBody
  >({
    mutationFn: (data) =>
      apiClient.post("measurement-units", { json: data }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: maintainerKeys.measurementUnits.all,
        exact: true,
      });
    },
  });
};

interface UpdateMeasurementUnitVariables {
  id: string;
  data: UpdateMeasurementUnitBody;
}

export const useUpdateMeasurementUnit = () => {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateMeasurementUnitResponse,
    Error,
    UpdateMeasurementUnitVariables
  >({
    mutationFn: ({ id, data }) =>
      apiClient.patch(`measurement-units/${id}`, { json: data }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: maintainerKeys.measurementUnits.all,
        exact: true,
      });
    },
  });
};

export const useDeleteMeasurementUnit = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      apiClient.delete(`measurement-units/${id}`).then(() => undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: maintainerKeys.measurementUnits.all,
        exact: true,
      });
    },
  });
};
