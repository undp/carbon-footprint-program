import { FC, useState, useCallback, PropsWithChildren } from "react";
import { Box, IconButtonProps, IconButton, Tooltip } from "@mui/material";
import {
  EditOutlined,
  DeleteOutlined,
  VisibilityOutlined,
} from "@mui/icons-material";
import { GetAllReductionProjectsResponse } from "@repo/types";
import {
  isReductionProjectEditable,
  isReductionProjectDeletable,
} from "@repo/utils";
import { DeleteReductionProjectDialog } from "./Dialogs";
import { enqueueSnackbar } from "notistack";
import { useDeleteReductionProject } from "@/api/query";
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

  const canEdit = isReductionProjectEditable(reductionProject.status);
  const canDelete = isReductionProjectDeletable(reductionProject.status);

  const { mutateAsync: deleteProject, isPending: isDeleting } =
    useDeleteReductionProject();

  const onEditClick = useCallback(() => {
    void navigate({
      to: Routes.REDUCTION_PROJECT,
      params: { id: reductionProject.id },
    });
  }, [navigate, reductionProject.id]);

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

  return (
    <>
      <Box className="flex justify-center gap-1">
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

      <DeleteReductionProjectDialog
        open={deleteDialogOpen}
        onClose={onDeleteCancel}
        onConfirm={onDeleteConfirm}
        isLoading={isDeleting}
      />
    </>
  );
};
