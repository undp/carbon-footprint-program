import { useCallback } from "react";
import { useSnackbar } from "notistack";
import { useNavigate } from "@tanstack/react-router";
import { useUpdateReductionProject } from "@/api/query/reductionProjects";
import { usePreUploadSubmissionFiles } from "@/api/query/submissions/usePreUploadSubmissionFiles";
import { mapFormValuesToRequest } from "../mappers";
import type { ReductionProjectFormValues } from "../types";
import type { ReductionProjectDisplayStatus } from "@repo/types";
import { Routes } from "@/interfaces";
import { ReductionProjectDisplayStatusEnum } from "@repo/types";

interface Params {
  projectId: string;
  status?: ReductionProjectDisplayStatus;
}

export const useReductionProjectSubmit = ({ projectId, status }: Params) => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const updateMutation = useUpdateReductionProject(projectId);
  const { preUploadFiles, isUploading } = usePreUploadSubmissionFiles();

  const submit = useCallback(
    async (data: ReductionProjectFormValues) => {
      try {
        const { files, ...formData } = data;
        const requestData = mapFormValuesToRequest(formData);

        if (
          status === ReductionProjectDisplayStatusEnum.REVIEWED &&
          files.length > 0
        ) {
          const fileUuids = await preUploadFiles(files);
          await updateMutation.mutateAsync({ ...requestData, fileUuids });
        } else {
          await updateMutation.mutateAsync(requestData);
        }

        enqueueSnackbar("Proyecto guardado exitosamente", {
          variant: "success",
        });
        void navigate({ to: Routes.REDUCTION_PROJECTS });
      } catch {
        enqueueSnackbar("No se pudo guardar el proyecto", {
          variant: "error",
        });
      }
    },
    [status, preUploadFiles, updateMutation, enqueueSnackbar, navigate]
  );

  return {
    submit,
    isSubmitting: updateMutation.isPending || isUploading,
  };
};
