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

export const useInitiatives = () =>
  useQuery<GetAllInitiativesResponse>({
    queryKey: maintainerKeys.initiatives.all,
    queryFn: () => apiClient.get("admin/reduction-plan").json(),
    staleTime: STALE_TIME_MS,
  });

export const useCreateInitiative = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  return useMutation<CreateInitiativeResponse, Error, CreateInitiativeRequest>({
    mutationFn: (data) =>
      apiClient.post("admin/reduction-plan", { json: data }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: maintainerKeys.initiatives.all,
      });
      void enqueueSnackbar({
        message: "Iniciativa creada exitosamente",
        variant: "success",
      });
    },
  });
};

interface UpdateInitiativeVariables {
  id: string;
  data: UpdateInitiativeRequest;
}

export const useUpdateInitiative = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  return useMutation<
    UpdateInitiativeResponse,
    Error,
    UpdateInitiativeVariables
  >({
    mutationFn: ({ id, data }) =>
      apiClient.patch(`admin/reduction-plan/${id}`, { json: data }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: maintainerKeys.initiatives.all,
      });
      void enqueueSnackbar({
        message: "Cambios guardados satisfactoriamente",
        variant: "success",
      });
    },
  });
};

export const useDeleteInitiative = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  return useMutation<DeleteInitiativeResponse, Error, string>({
    mutationFn: (id) => apiClient.delete(`admin/reduction-plan/${id}`).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: maintainerKeys.initiatives.all,
      });
      void enqueueSnackbar({
        message: "Iniciativa eliminada",
        variant: "success",
      });
    },
  });
};
