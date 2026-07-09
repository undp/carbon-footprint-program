import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { measurementUnitKeys } from "@/api/query/measurementUnits/keys";
import { maintainerKeys, MaintainerQueryKey } from "./keys";
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

// Invalidating by `MagnitudesUpdateDependency` refreshes every maintainer query
// that declares it (magnitudes and measurement units). Magnitude names also
// surface in the app-wide unit pickers, so the non-maintainer `measurementUnits`
// namespace is invalidated explicitly.
const invalidateMagnitudes = (
  queryClient: ReturnType<typeof useQueryClient>
) => {
  void queryClient.invalidateQueries({
    predicate: (query) =>
      query.queryKey.includes(MaintainerQueryKey.MagnitudesUpdateDependency),
  });
  void queryClient.invalidateQueries({
    queryKey: measurementUnitKeys.allMeasurementUnits,
  });
  void queryClient.invalidateQueries({
    queryKey: measurementUnitKeys.allRateMeasurementUnits,
  });
};

export const useAddMagnitude = () => {
  const queryClient = useQueryClient();
  return useMutation<CreateMagnitudeResponse, Error, CreateMagnitudeBody>({
    mutationFn: (data) => apiClient.post("magnitudes", { json: data }).json(),
    onSuccess: () => invalidateMagnitudes(queryClient),
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
    onSuccess: () => invalidateMagnitudes(queryClient),
  });
};

export const useDeleteMagnitude = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`magnitudes/${id}`);
    },
    onSuccess: () => invalidateMagnitudes(queryClient),
  });
};
