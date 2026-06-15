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
        // DRAFT-first: create/update persist fields only. Files and the
        // verification submission are handled separately from the list, via
        // the "Postular a reconocimiento de verificación" action.
        const mutationData = mapFormValuesToMutationData(data);

        if (projectId) {
          await updateMutation.mutateAsync(mutationData);
          enqueueSnackbar("Proyecto guardado exitosamente", {
            variant: "success",
          });
        } else {
          await createMutation.mutateAsync(mutationData);
          enqueueSnackbar("Proyecto creado exitosamente", {
            variant: "success",
          });
        }

        void navigate({ to: Routes.REDUCTION_PROJECTS });
      } catch {
        enqueueSnackbar(
          projectId
            ? "No se pudo guardar el proyecto"
            : "No se pudo crear el proyecto",
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
