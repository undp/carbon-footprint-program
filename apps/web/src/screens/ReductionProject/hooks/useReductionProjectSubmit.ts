import { useCallback } from "react";
import { useSnackbar } from "notistack";
import { useNavigate } from "@tanstack/react-router";
import {
  useCreateReductionProject,
  useUpdateReductionProject,
} from "@/api/query/reductionProjects";
import { mapFormValuesToMutationData } from "../mappers";
import type { ReductionProjectFormValues } from "../formSchema";
import { Routes } from "@/interfaces";

interface Params {
  projectId?: string;
}

export const useReductionProjectSubmit = ({ projectId }: Params) => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const createMutation = useCreateReductionProject();
  const updateMutation = useUpdateReductionProject(projectId ?? "");

  const submit = useCallback(
    async (data: ReductionProjectFormValues) => {
      try {
        const mutationData = mapFormValuesToMutationData(data);

        if (projectId) {
          await updateMutation.mutateAsync(mutationData);
          enqueueSnackbar("Proyecto guardado exitosamente", {
            variant: "success",
          });
        } else {
          await createMutation.mutateAsync(mutationData);
          enqueueSnackbar("Borrador guardado exitosamente", {
            variant: "success",
          });
        }

        void navigate({ to: Routes.REDUCTION_PROJECTS });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        enqueueSnackbar(
          projectId
            ? "No se pudo guardar el proyecto"
            : "No se pudo guardar el borrador",
          { variant: "error" }
        );
      }
    },
    [projectId, createMutation, updateMutation, enqueueSnackbar, navigate]
  );

  return {
    submit,
    isSubmitting: projectId
      ? updateMutation.isPending
      : createMutation.isPending,
  };
};
