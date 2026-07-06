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
        // Files are never pre-uploaded here — the create/update endpoints only
        // save the (possibly partial) draft. Documents are attached exclusively
        // through the "Postular a reconocimiento" flow in the list actions cell.
        const { files: _files, sworn: _sworn, ...formData } = data;
        const mutationData = mapFormValuesToMutationData(formData);

        if (projectId) {
          // The PATCH response is `null`; the mutation awaits without `.json()`.
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
