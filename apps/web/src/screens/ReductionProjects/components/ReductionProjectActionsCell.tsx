import { FC, useState, useCallback, PropsWithChildren } from "react";
import { Box, IconButtonProps, IconButton, Tooltip } from "@mui/material";
import {
  EditOutlined,
  VerifiedOutlined,
  DeleteOutlined,
  VisibilityOutlined,
} from "@mui/icons-material";
import {
  GetAllReductionProjectsResponse,
  OrganizationDisplayStatusValues,
} from "@repo/types";
import {
  isReductionProjectEditable,
  isReductionProjectDeletable,
  canRequestReductionProjectVerification,
} from "@repo/utils";
import {
  DeleteReductionProjectDialog,
  VerifyReductionProjectDialog,
  MissingOrganizationDialog,
  UnaccreditedOrganizationDialog,
  BlockedOrganizationDialog,
  IncompleteProjectDialog,
} from "./Dialogs";
import { enqueueSnackbar } from "notistack";
import {
  useDeleteReductionProject,
  useRequestReductionProjectVerification,
  useOrganization,
  usePreUploadSubmissionFiles,
} from "@/api/query";
import { Routes } from "@/interfaces";
import { useNavigate } from "@tanstack/react-router";

const BaseIconButton: FC<PropsWithChildren<IconButtonProps>> = ({
  children,
  ...props
}) => (
  <IconButton
    sx={(theme) => ({
      border: `1px solid ${props.disabled ? theme.palette.action.disabled : theme.palette.primary.main}`,
      borderRadius: "4px",
      padding: "4px",
    })}
    color="primary"
    size="small"
    {...props}
  >
    {children}
  </IconButton>
);

interface ReductionProjectActionsCellProps {
  reductionProject: GetAllReductionProjectsResponse[number];
}

export const ReductionProjectActionsCell: FC<
  ReductionProjectActionsCellProps
> = ({ reductionProject }) => {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [missingOrgDialogOpen, setMissingOrgDialogOpen] = useState(false);
  const [unaccreditedOrgDialogOpen, setUnaccreditedOrgDialogOpen] =
    useState(false);
  const [blockedOrgDialogOpen, setBlockedOrgDialogOpen] = useState(false);
  const [incompleteDialogOpen, setIncompleteDialogOpen] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const canEdit = isReductionProjectEditable(reductionProject.status);
  const canRequestVerification = canRequestReductionProjectVerification(
    reductionProject.status
  );
  const canDelete = isReductionProjectDeletable(reductionProject.status);

  const { data: organization, isLoading: isOrganizationLoading } =
    useOrganization(reductionProject.organizationId ?? undefined);

  const { mutateAsync: deleteProject, isPending: isDeleting } =
    useDeleteReductionProject();
  const { mutateAsync: requestVerification } =
    useRequestReductionProjectVerification();
  const { preUploadFiles } = usePreUploadSubmissionFiles();
  const [isVerifySubmitting, setIsVerifySubmitting] = useState(false);

  const onEditClick = useCallback(() => {
    void navigate({
      to: Routes.REDUCTION_PROJECT,
      params: { id: reductionProject.id },
    });
  }, [navigate, reductionProject.id]);

  const getProjectMissingFields = useCallback(() => {
    const fields: string[] = [];
    if (!reductionProject.name) fields.push("nombre");
    if (reductionProject.year == null) fields.push("año");
    return fields;
  }, [reductionProject.name, reductionProject.year]);

  const onDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const onDeleteConfirm = useCallback(async () => {
    try {
      await deleteProject(reductionProject.id);
      setDeleteDialogOpen(false);
      enqueueSnackbar("Proyecto eliminado", { variant: "success" });
    } catch {
      enqueueSnackbar("No se pudo eliminar el proyecto", {
        variant: "error",
      });
    }
  }, [reductionProject.id, deleteProject]);

  const onDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
  }, []);

  const onVerifyClick = useCallback(() => {
    const fields = getProjectMissingFields();
    if (fields.length > 0) {
      setMissingFields(fields);
      setIncompleteDialogOpen(true);
      return;
    }
    if (reductionProject.organizationId === null) {
      setMissingOrgDialogOpen(true);
      return;
    }
    if (organization?.status === OrganizationDisplayStatusValues.BLOCKED) {
      setBlockedOrgDialogOpen(true);
      return;
    }
    if (
      organization?.status === OrganizationDisplayStatusValues.NOT_ACCREDITED
    ) {
      setUnaccreditedOrgDialogOpen(true);
      return;
    }
    setVerifyDialogOpen(true);
  }, [
    getProjectMissingFields,
    reductionProject.organizationId,
    organization?.status,
  ]);

  const onVerifyConfirm = useCallback(
    async (files: File[]) => {
      setIsVerifySubmitting(true);
      try {
        let fileUuids: string[] | undefined;
        if (files.length) {
          try {
            fileUuids = await preUploadFiles(files);
          } catch {
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
        setVerifyDialogOpen(false);
        enqueueSnackbar("Solicitud de verificación enviada", {
          variant: "success",
        });
      } catch {
        enqueueSnackbar("No se pudo enviar la solicitud de verificación", {
          variant: "error",
        });
      } finally {
        setIsVerifySubmitting(false);
      }
    },
    [reductionProject.id, requestVerification, preUploadFiles]
  );

  const onVerifyCancel = useCallback(() => {
    setVerifyDialogOpen(false);
  }, []);

  return (
    <>
      <Box className="flex justify-center gap-1">
        {/* Edit / View button */}
        {canEdit ? (
          <Tooltip title="Editar proyecto">
            <BaseIconButton onClick={onEditClick} aria-label="Editar proyecto">
              <EditOutlined fontSize="small" />
            </BaseIconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Ver proyecto">
            <span>
              <BaseIconButton onClick={onEditClick} aria-label="Ver proyecto">
                <VisibilityOutlined fontSize="small" />
              </BaseIconButton>
            </span>
          </Tooltip>
        )}

        {/* Request Verification button */}
        <Tooltip title="Postular a sello de reducción">
          <span>
            <BaseIconButton
              onClick={onVerifyClick}
              disabled={!canRequestVerification || isOrganizationLoading}
              aria-label="Postular a sello de reducción"
            >
              <VerifiedOutlined fontSize="small" />
            </BaseIconButton>
          </span>
        </Tooltip>

        {/* Delete button */}
        <Tooltip
          title={canDelete ? "Eliminar" : "No se puede eliminar este proyecto"}
        >
          <span>
            <BaseIconButton
              onClick={onDeleteClick}
              disabled={!canDelete}
              aria-label="Eliminar"
            >
              <DeleteOutlined fontSize="small" />
            </BaseIconButton>
          </span>
        </Tooltip>
      </Box>

      <VerifyReductionProjectDialog
        open={verifyDialogOpen}
        onClose={onVerifyCancel}
        onConfirm={onVerifyConfirm}
        isLoading={isVerifySubmitting}
        organizationId={reductionProject.organizationId}
      />

      <DeleteReductionProjectDialog
        open={deleteDialogOpen}
        onClose={onDeleteCancel}
        onConfirm={onDeleteConfirm}
        isLoading={isDeleting}
      />

      <MissingOrganizationDialog
        open={missingOrgDialogOpen}
        onClose={() => setMissingOrgDialogOpen(false)}
      />

      <UnaccreditedOrganizationDialog
        open={unaccreditedOrgDialogOpen}
        onClose={() => setUnaccreditedOrgDialogOpen(false)}
      />

      <BlockedOrganizationDialog
        open={blockedOrgDialogOpen}
        onClose={() => setBlockedOrgDialogOpen(false)}
      />

      <IncompleteProjectDialog
        open={incompleteDialogOpen}
        onClose={() => setIncompleteDialogOpen(false)}
        missingFields={missingFields}
      />
    </>
  );
};
