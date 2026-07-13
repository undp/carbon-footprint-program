import { FC, useCallback, useState } from "react";
import { Box } from "@mui/material";
import {
  EditOutlined,
  VisibilityOutlined,
  FileDownloadOutlined,
  VerifiedOutlined,
  DeleteOutline,
} from "@mui/icons-material";
import { enqueueSnackbar } from "notistack";
import {
  GetAllReductionProjectsResponse,
  OrganizationDisplayStatusValues,
  ReductionProjectDisplayStatusEnum,
} from "@repo/types";
import {
  canRequestReductionProjectVerification,
  getReductionProjectMissingFields,
  isReductionProjectDeletable,
  isReductionProjectEditable,
  type ReductionProjectMissingField,
} from "@repo/utils";
import { useNavigate } from "@tanstack/react-router";
import {
  useRequestReductionProjectVerification,
  useDeleteReductionProject,
  usePreUploadSubmissionFiles,
} from "@/api/query";
import { Routes } from "@/interfaces";
import { ViewSubmissionDialog } from "@/components/dialogs/SubmissionHistory";
import {
  AppActionButton,
  HistoryActionButton,
  primaryActionButtonSx,
} from "@/components";
import {
  UnaccreditedOrganizationDialog,
  BlockedOrganizationDialog,
} from "@/components/dialogs";
import { useDownloadReductionProject } from "../hooks/useDownloadReductionProject";
import { IncompleteReductionProjectDialog } from "./Dialogs/IncompleteReductionProjectDialog";
import { PostulateReductionProjectDialog } from "./Dialogs/PostulateReductionProjectDialog";
import { DeleteReductionProjectDialog } from "./Dialogs/DeleteReductionProjectDialog";

interface ReductionProjectActionsCellProps {
  reductionProject: GetAllReductionProjectsResponse[number];
}

export const ReductionProjectActionsCell: FC<
  ReductionProjectActionsCellProps
> = ({ reductionProject }) => {
  const navigate = useNavigate();
  const { download, isDownloading } = useDownloadReductionProject();

  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [postulateDialogOpen, setPostulateDialogOpen] = useState(false);
  const [incompleteDialogOpen, setIncompleteDialogOpen] = useState(false);
  const [unaccreditedOrgDialogOpen, setUnaccreditedOrgDialogOpen] =
    useState(false);
  const [blockedOrgDialogOpen, setBlockedOrgDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [missingFields, setMissingFields] = useState<
    ReductionProjectMissingField[]
  >([]);
  const [isPostulateSubmitting, setIsPostulateSubmitting] = useState(false);

  const canEdit = isReductionProjectEditable(reductionProject.status);
  const canRequestVerification = canRequestReductionProjectVerification(
    reductionProject.status
  );
  const canDelete = isReductionProjectDeletable(reductionProject.status);

  const { mutateAsync: requestVerification } =
    useRequestReductionProjectVerification();
  const { mutateAsync: deleteProject, isPending: isDeleting } =
    useDeleteReductionProject();
  const { preUploadFiles } = usePreUploadSubmissionFiles();

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

  const validateBeforeSubmit = useCallback(() => {
    const fields = getReductionProjectMissingFields(reductionProject);
    if (fields.length > 0) {
      setMissingFields(fields);
      setIncompleteDialogOpen(true);
      return false;
    }
    // organizationId is required at create (enforced by the form's Zod schema),
    // so a list row always has one — no missing-org branch needed here (unlike CI).
    if (
      reductionProject.organizationDisplayStatus ===
      OrganizationDisplayStatusValues.BLOCKED
    ) {
      setBlockedOrgDialogOpen(true);
      return false;
    }
    if (
      reductionProject.organizationDisplayStatus ===
      OrganizationDisplayStatusValues.NOT_ACCREDITED
    ) {
      setUnaccreditedOrgDialogOpen(true);
      return false;
    }
    return true;
  }, [reductionProject]);

  const onPostulateClick = useCallback(() => {
    if (validateBeforeSubmit()) {
      setPostulateDialogOpen(true);
    }
  }, [validateBeforeSubmit]);

  const onPostulateConfirm = useCallback(
    async (files: File[]) => {
      setIsPostulateSubmitting(true);
      try {
        let fileUuids: string[] | undefined;
        if (files.length) {
          try {
            fileUuids = await preUploadFiles(files);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            enqueueSnackbar("No se pudieron subir los archivos adjuntos", {
              variant: "error",
            });
            return;
          }
        }
        await requestVerification({
          id: reductionProject.id,
          body: { fileUuids },
        });
        setPostulateDialogOpen(false);
        enqueueSnackbar("Solicitud de reconocimiento de reducción enviada", {
          variant: "success",
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        enqueueSnackbar(
          "No se pudo enviar la solicitud de reconocimiento de reducción",
          { variant: "error" }
        );
      } finally {
        setIsPostulateSubmitting(false);
      }
    },
    [reductionProject.id, requestVerification, preUploadFiles]
  );

  const onDeleteConfirm = useCallback(async () => {
    try {
      await deleteProject(reductionProject.id);
      setDeleteDialogOpen(false);
      enqueueSnackbar("Proyecto de reducción eliminado", {
        variant: "success",
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      enqueueSnackbar("No se pudo eliminar el proyecto de reducción", {
        variant: "error",
      });
    }
  }, [deleteProject, reductionProject.id]);

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

        {/* Postular a reconocimiento de reducción */}
        <AppActionButton
          tooltip="Postular a reconocimiento de reducción"
          onClick={onPostulateClick}
          disabled={!canRequestVerification}
          sx={primaryActionButtonSx}
        >
          <VerifiedOutlined fontSize="small" />
        </AppActionButton>

        {/* Eliminar (solo borradores) */}
        {canDelete && (
          <AppActionButton
            tooltip="Eliminar proyecto"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isDeleting}
          >
            <DeleteOutline fontSize="small" />
          </AppActionButton>
        )}
      </Box>

      {historyDialogOpen && (
        <ViewSubmissionDialog
          open={historyDialogOpen}
          reductionProjectId={reductionProject.id}
          onClose={() => setHistoryDialogOpen(false)}
        />
      )}

      <PostulateReductionProjectDialog
        open={postulateDialogOpen}
        onClose={() => setPostulateDialogOpen(false)}
        onConfirm={onPostulateConfirm}
        isLoading={isPostulateSubmitting}
      />

      <IncompleteReductionProjectDialog
        open={incompleteDialogOpen}
        onClose={() => setIncompleteDialogOpen(false)}
        missingFields={missingFields}
      />

      <UnaccreditedOrganizationDialog
        open={unaccreditedOrgDialogOpen}
        onClose={() => setUnaccreditedOrgDialogOpen(false)}
      />

      <BlockedOrganizationDialog
        open={blockedOrgDialogOpen}
        onClose={() => setBlockedOrgDialogOpen(false)}
      />

      <DeleteReductionProjectDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={onDeleteConfirm}
        isLoading={isDeleting}
      />
    </>
  );
};
