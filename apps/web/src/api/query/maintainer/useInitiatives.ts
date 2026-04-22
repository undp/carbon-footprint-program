import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { apiClient } from "@/api/http";
import { maintainerKeys } from "./keys";
import { STALE_TIME_MS } from "@/config/constants";
import type {
  GetAllInitiativesResponse,
  CreateInitiativeRequest,
  CreateInitiativeResponse,
  UpdateInitiativeRequest,
  UpdateInitiativeResponse,
  DeleteInitiativeResponse,
} from "@repo/types";

const useInitiativeMutationSuccess = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return (message: string) => {
    void queryClient.invalidateQueries({
      queryKey: maintainerKeys.initiatives.all,
    });
    void enqueueSnackbar({ message, variant: "success" });
  };
};

export const useInitiatives = () =>
  useQuery<GetAllInitiativesResponse>({
    queryKey: maintainerKeys.initiatives.all,
    queryFn: () =>
      apiClient.get("admin/reduction-plan").json<GetAllInitiativesResponse>(),
    staleTime: STALE_TIME_MS,
  });

export const useCreateInitiative = () => {
  const onMutationSuccess = useInitiativeMutationSuccess();
  return useMutation<CreateInitiativeResponse, Error, CreateInitiativeRequest>({
    mutationFn: (data) =>
      apiClient
        .post("admin/reduction-plan", { json: data })
        .json<CreateInitiativeResponse>(),
    onSuccess: () => onMutationSuccess("Iniciativa creada exitosamente"),
  });
};

interface UpdateInitiativeVariables {
  id: string;
  data: UpdateInitiativeRequest;
}

export const useUpdateInitiative = () => {
  const onMutationSuccess = useInitiativeMutationSuccess();
  return useMutation<
    UpdateInitiativeResponse,
    Error,
    UpdateInitiativeVariables
  >({
    mutationFn: ({ id, data }) =>
      apiClient
        .patch(`admin/reduction-plan/${id}`, { json: data })
        .json<UpdateInitiativeResponse>(),
    onSuccess: () => onMutationSuccess("Cambios guardados satisfactoriamente"),
  });
};

export const useDeleteInitiative = () => {
  const onMutationSuccess = useInitiativeMutationSuccess();
  return useMutation<DeleteInitiativeResponse, Error, string>({
    mutationFn: (id) =>
      apiClient
        .delete(`admin/reduction-plan/${id}`)
        .json<DeleteInitiativeResponse>(),
    onSuccess: () => onMutationSuccess("Iniciativa eliminada"),
  });
};
