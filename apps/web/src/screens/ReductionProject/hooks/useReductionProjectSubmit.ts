import { useCallback } from "react";
import { useSnackbar } from "notistack";
import { useNavigate } from "@tanstack/react-router";
import {
  useCreateReductionProject,
  useUpdateReductionProject,
} from "@/api/query/reductionProjects";
import { usePreUploadSubmissionFiles } from "@/api/query/submissions/usePreUploadSubmissionFiles";
import { mapFormValuesToMutationData } from "../mappers";
import type { ReductionProjectFormValues } from "../types";
import { Routes } from "@/interfaces";

interface Params {
  projectId?: string;
}

export const useReductionProjectSubmit = ({ projectId }: Params) => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const createMutation = useCreateReductionProject();
  const updateMutation = useUpdateReductionProject(projectId ?? "");
  const { preUploadFiles, isUploading } = usePreUploadSubmissionFiles();

  const submit = useCallback(
    async (data: ReductionProjectFormValues) => {
      try {
        const { files, ...formData } = data;

        const fileUuids = await preUploadFiles(files);
        if (!fileUuids.length) {
          enqueueSnackbar("No se pudieron subir los archivos", {
            variant: "error",
          });
          return;
        }

        const mutationData = mapFormValuesToMutationData(formData, fileUuids);

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
    [
      projectId,
      createMutation,
      updateMutation,
      preUploadFiles,
      enqueueSnackbar,
      navigate,
    ]
  );

  return {
    submit,
    isSubmitting:
      (projectId ? updateMutation.isPending : createMutation.isPending) ||
      isUploading,
  };
};
