import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { apiClient } from "@/api/http";
import { maintainerKeys } from "./keys";
import { STALE_TIME_MS } from "@/config/constants";
import type {
  GetAllReductionPlanInitiativesResponse,
  CreateReductionPlanInitiativeRequest,
  CreateReductionPlanInitiativeResponse,
  UpdateReductionPlanInitiativeRequest,
  UpdateReductionPlanInitiativeResponse,
  DeleteReductionPlanInitiativeResponse,
} from "@repo/types";

const useReductionPlanInitiativeMutationSuccess = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return (message: string) => {
    void queryClient.invalidateQueries({
      queryKey: maintainerKeys.reductionPlanInitiatives.all,
    });
    void enqueueSnackbar({ message, variant: "success" });
  };
};

export const useReductionPlanInitiatives = (methodologyVersionId?: string) =>
  useQuery<GetAllReductionPlanInitiativesResponse>({
    queryKey: maintainerKeys.reductionPlanInitiatives.byMethodology(
      methodologyVersionId ?? ""
    ),
    queryFn: () =>
      apiClient
        .get("admin/reduction-plan", {
          searchParams: methodologyVersionId ? { methodologyVersionId } : {},
        })
        .json<GetAllReductionPlanInitiativesResponse>(),
    enabled: !!methodologyVersionId,
    staleTime: STALE_TIME_MS,
  });

export const useAddReductionPlanInitiative = () => {
  const onMutationSuccess = useReductionPlanInitiativeMutationSuccess();
  return useMutation<
    CreateReductionPlanInitiativeResponse,
    Error,
    CreateReductionPlanInitiativeRequest
  >({
    mutationFn: (data) =>
      apiClient
        .post("admin/reduction-plan", { json: data })
        .json<CreateReductionPlanInitiativeResponse>(),
    onSuccess: () => onMutationSuccess("Iniciativa creada exitosamente"),
  });
};

interface UpdateReductionPlanInitiativeVariables {
  id: string;
  data: UpdateReductionPlanInitiativeRequest;
}

export const useUpdateReductionPlanInitiative = () => {
  const onMutationSuccess = useReductionPlanInitiativeMutationSuccess();
  return useMutation<
    UpdateReductionPlanInitiativeResponse,
    Error,
    UpdateReductionPlanInitiativeVariables
  >({
    mutationFn: ({ id, data }) =>
      apiClient
        .patch(`admin/reduction-plan/${id}`, { json: data })
        .json<UpdateReductionPlanInitiativeResponse>(),
    onSuccess: () => onMutationSuccess("Cambios guardados satisfactoriamente"),
  });
};

export const useDeleteReductionPlanInitiative = () => {
  const onMutationSuccess = useReductionPlanInitiativeMutationSuccess();
  return useMutation<DeleteReductionPlanInitiativeResponse, Error, string>({
    mutationFn: (id) =>
      apiClient
        .delete(`admin/reduction-plan/${id}`)
        .json<DeleteReductionPlanInitiativeResponse>(),
    onSuccess: () => onMutationSuccess("Iniciativa eliminada"),
  });
};
