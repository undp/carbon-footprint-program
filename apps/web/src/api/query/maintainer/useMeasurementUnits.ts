import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { measurementUnitKeys } from "@/api/query/measurementUnits/keys";
import { maintainerKeys, MaintainerQueryKey } from "./keys";
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

// Invalidating by `MeasurementUnitsUpdateDependency` refreshes every maintainer
// query that declares it (units, magnitudes, subcategories, emission factors).
// Units also feed the non-maintainer `measurementUnits` namespace (the emission
// factor unit dropdown via `useRateMeasurementUnits`, and app-wide pickers), so
// those keys are invalidated explicitly.
const invalidateMeasurementUnits = (
  queryClient: ReturnType<typeof useQueryClient>
) => {
  void queryClient.invalidateQueries({
    predicate: (query) =>
      query.queryKey.includes(
        MaintainerQueryKey.MeasurementUnitsUpdateDependency
      ),
  });
  void queryClient.invalidateQueries({
    queryKey: measurementUnitKeys.allMeasurementUnits,
  });
  void queryClient.invalidateQueries({
    queryKey: measurementUnitKeys.allRateMeasurementUnits,
  });
};

export const useAddMeasurementUnit = () => {
  const queryClient = useQueryClient();
  return useMutation<
    CreateMeasurementUnitResponse,
    Error,
    CreateMeasurementUnitBody
  >({
    mutationFn: (data) =>
      apiClient.post("measurement-units", { json: data }).json(),
    onSuccess: () => invalidateMeasurementUnits(queryClient),
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
    onSuccess: () => invalidateMeasurementUnits(queryClient),
  });
};

export const useDeleteMeasurementUnit = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`measurement-units/${id}`);
    },
    onSuccess: () => invalidateMeasurementUnits(queryClient),
  });
};
