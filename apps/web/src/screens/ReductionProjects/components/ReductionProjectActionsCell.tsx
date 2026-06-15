import { FC, useCallback, useState } from "react";
import { Box } from "@mui/material";
import {
  EditOutlined,
  VisibilityOutlined,
  FileDownloadOutlined,
  VerifiedOutlined,
  DeleteOutlined,
} from "@mui/icons-material";
import { useDownloadReductionProject } from "../hooks/useDownloadReductionProject";
import {
  GetAllReductionProjectsResponse,
  ReductionProjectDisplayStatusEnum,
} from "@repo/types";
import {
  isReductionProjectEditable,
  canSubmitReductionProjectToVerification,
  isReductionProjectDeletable,
} from "@repo/utils";
import { Routes } from "@/interfaces";
import { useNavigate } from "@tanstack/react-router";
import { enqueueSnackbar } from "notistack";
import { ViewSubmissionDialog } from "@/components/dialogs/SubmissionHistory";
import {
  AppActionButton,
  HistoryActionButton,
  primaryActionButtonSx,
} from "@/components";
import { usePreUploadSubmissionFiles } from "@/api/query/submissions/usePreUploadSubmissionFiles";
import {
  useRequestReductionProjectVerification,
  useDeleteReductionProject,
} from "@/api/query/reductionProjects";
import { RequestVerificationDialog } from "./Dialogs/RequestVerification";
import { DeleteConfirmationDialog } from "./Dialogs/DeleteConfirmationDialog";
import {
  REDUCTION_PROJECT_VERIFICATION_TOOLTIP,
  REDUCTION_PROJECT_DELETE_TOOLTIP,
  REDUCTION_PROJECT_DELETE_DISABLED_TOOLTIP,
} from "../constants";

interface ReductionProjectActionsCellProps {
  reductionProject: GetAllReductionProjectsResponse[number];
}

export const ReductionProjectActionsCell: FC<
  ReductionProjectActionsCellProps
> = ({ reductionProject }) => {
  const navigate = useNavigate();
  const { download, isDownloading } = useDownloadReductionProject();
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isVerifySubmitting, setIsVerifySubmitting] = useState(false);

  const canEdit = isReductionProjectEditable(reductionProject.status);
  const canRequestVerification = canSubmitReductionProjectToVerification(
    reductionProject.status
  );
  const canDelete = isReductionProjectDeletable(reductionProject.status);

  const { preUploadFiles } = usePreUploadSubmissionFiles();
  const { mutateAsync: requestVerification } =
    useRequestReductionProjectVerification();
  const { mutateAsync: deleteProject, isPending: isDeleting } =
    useDeleteReductionProject();

  const onEditClick = useCallback(() => {
    void navigate({
      to: Routes.REDUCTION_PROJECT_EDIT,
      params: { id: reductionProject.id },
    });
  }, [navigate, reductionProject.id]);

  const onViewClick = useCallback(() => {
    void navigate({
      to: Routes.REDUCTION_PROJECT_DETAILS,
      params: { id: reductionProject.id },
    });
  }, [navigate, reductionProject.id]);

  const onDownloadClick = useCallback(() => {
    void download(reductionProject.id, reductionProject.organizationName);
  }, [download, reductionProject.id, reductionProject.organizationName]);

  const onVerifyConfirm = useCallback(
    async (files: File[]) => {
      setIsVerifySubmitting(true);
      try {
        let fileUuids: string[];
        try {
          fileUuids = await preUploadFiles(files);
        } catch {
          enqueueSnackbar("No se pudieron subir los archivos adjuntos", {
            variant: "error",
          });
          return;
        }
        await requestVerification({
          id: reductionProject.id,
          body: { fileUuids },
        });
        setVerifyDialogOpen(false);
        enqueueSnackbar("Solicitud de reconocimiento de verificación enviada", {
          variant: "success",
        });
      } catch {
        enqueueSnackbar(
          "No se pudo enviar la solicitud de reconocimiento de verificación",
          { variant: "error" }
        );
      } finally {
        setIsVerifySubmitting(false);
      }
    },
    [reductionProject.id, requestVerification, preUploadFiles]
  );

  const onDeleteConfirm = useCallback(async () => {
    try {
      await deleteProject(reductionProject.id);
      setDeleteDialogOpen(false);
      enqueueSnackbar("Proyecto eliminado", { variant: "success" });
    } catch {
      enqueueSnackbar("No se pudo eliminar el proyecto", { variant: "error" });
    }
  }, [reductionProject.id, deleteProject]);

  return (
    <>
      <Box className="flex justify-center gap-1">
        {canEdit ? (
          <AppActionButton tooltip="Editar proyecto" onClick={onEditClick}>
            <EditOutlined fontSize="small" />
          </AppActionButton>
        ) : (
          <AppActionButton tooltip="Ver proyecto" onClick={onViewClick}>
            <VisibilityOutlined fontSize="small" />
          </AppActionButton>
        )}

        {/* Postular a reconocimiento de verificación */}
        <AppActionButton
          tooltip={REDUCTION_PROJECT_VERIFICATION_TOOLTIP}
          onClick={() => setVerifyDialogOpen(true)}
          disabled={!canRequestVerification}
          sx={primaryActionButtonSx}
        >
          <VerifiedOutlined fontSize="small" />
        </AppActionButton>

        {/* Historial */}
        <HistoryActionButton
          hasUpdate={
            reductionProject.status ===
            ReductionProjectDisplayStatusEnum.REVIEWED
          }
          onClick={() => setHistoryDialogOpen(true)}
        />

        <AppActionButton
          tooltip="Descargar proyecto"
          onClick={onDownloadClick}
          disabled={isDownloading}
        >
          <FileDownloadOutlined fontSize="small" />
        </AppActionButton>

        {/* Eliminar (solo borradores) */}
        <AppActionButton
          tooltip={
            canDelete
              ? REDUCTION_PROJECT_DELETE_TOOLTIP
              : REDUCTION_PROJECT_DELETE_DISABLED_TOOLTIP
          }
          onClick={() => setDeleteDialogOpen(true)}
          disabled={!canDelete || isDeleting}
          aria-label="Eliminar proyecto"
        >
          <DeleteOutlined fontSize="small" />
        </AppActionButton>
      </Box>

      <RequestVerificationDialog
        open={verifyDialogOpen}
        onClose={() => setVerifyDialogOpen(false)}
        onConfirm={onVerifyConfirm}
        isLoading={isVerifySubmitting}
        organizationId={reductionProject.organizationId}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={onDeleteConfirm}
        isLoading={isDeleting}
      />

      {historyDialogOpen && (
        <ViewSubmissionDialog
          open={historyDialogOpen}
          reductionProjectId={reductionProject.id}
          onClose={() => setHistoryDialogOpen(false)}
        />
      )}
    </>
  );
};
