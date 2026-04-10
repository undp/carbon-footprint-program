import { useCallback } from "react";
import { useSnackbar } from "notistack";
import { useNavigate } from "@tanstack/react-router";
import { useCreateReductionProject } from "@/api/query/reductionProjects";
import { usePreUploadSubmissionFiles } from "@/api/query/submissions/usePreUploadSubmissionFiles";
import { mapFormValuesToMutationData } from "../mappers";
import type { ReductionProjectFormValues } from "../types";
import { Routes } from "@/interfaces";

export const useCreateReductionProjectSubmit = () => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const createMutation = useCreateReductionProject();
  const { preUploadFiles, isUploading } = usePreUploadSubmissionFiles();

  const submit = useCallback(
    async (data: ReductionProjectFormValues) => {
      try {
        const { files, ...formData } = data;

        if (!files.length) {
          enqueueSnackbar("Debes adjuntar al menos un archivo", {
            variant: "error",
          });
          return;
        }

        const fileUuids = await preUploadFiles(files);
        if (!fileUuids.length) {
          enqueueSnackbar("No se pudieron subir los archivos", {
            variant: "error",
          });
          return;
        }

        const mutationData = mapFormValuesToMutationData(formData);
        await createMutation.mutateAsync({ ...mutationData, fileUuids });

        enqueueSnackbar("Proyecto creado exitosamente", { variant: "success" });
        void navigate({ to: Routes.REDUCTION_PROJECTS });
      } catch {
        enqueueSnackbar("No se pudo crear el proyecto", { variant: "error" });
      }
    },
    [createMutation, preUploadFiles, enqueueSnackbar, navigate]
  );

  return {
    submit,
    isSubmitting: createMutation.isPending || isUploading,
  };
};
