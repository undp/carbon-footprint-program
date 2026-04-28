import { FC, ReactNode, useState } from "react";
import {
  Box,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import {
  EditOutlined,
  VisibilityOutlined,
  ContentCopyOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  KeyboardArrowUpOutlined,
  KeyboardArrowDownOutlined,
  TuneOutlined,
} from "@mui/icons-material";

interface ActionButtonProps {
  isActiveRow: boolean;
  isEditing?: boolean;
  onStopEditCells?: () => void;
  onCancelEdit?: () => void;
  onEdit?: () => void;
  onView?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onConfigureVariables?: () => void;
  moveUpDisabled?: boolean;
  moveDownDisabled?: boolean;
  deleteDisabled?: boolean;
  deleteTooltipTitle?: string;
  deleteConfirmMessage?: string;
  /**
   * Optional override for the delete confirmation dialog. When provided, the default
   * `<Dialog>` rendered by `ActionButtons` is suppressed and the consumer renders its
   * own dialog (e.g., `DeleteWarningDialog`). The consumer receives `open` + the two
   * handlers — calling `onConfirm` triggers the actual delete and closes the dialog.
   */
  renderDeleteDialog?: (props: {
    open: boolean;
    onCancel: () => void;
    onConfirm: () => void;
  }) => ReactNode;
}

export const ActionButtons: FC<ActionButtonProps> = ({
  isActiveRow,
  isEditing = false,
  onStopEditCells,
  onCancelEdit,
  onEdit,
  onView,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onConfigureVariables,
  moveUpDisabled = false,
  moveDownDisabled = false,
  deleteDisabled = false,
  deleteTooltipTitle,
  deleteConfirmMessage = "¿Estás seguro de que deseas eliminar este registro?",
  renderDeleteDialog,
}) => {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isDeleteDisabled = isActiveRow || deleteDisabled;
  const resolvedDeleteTooltipTitle = isDeleteDisabled
    ? (deleteTooltipTitle ??
      (isActiveRow
        ? "Finaliza la edición actual para eliminar"
        : "No se puede eliminar este registro"))
    : "Eliminar";

  return (
    <>
      <Box className="flex justify-end gap-1 pr-4">
        {isEditing && onStopEditCells && (
          <Tooltip title="Guardar cambios">
            <IconButton size="small" onClick={onStopEditCells}>
              <SaveOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {isEditing && onCancelEdit && (
          <Tooltip title="Cancelar edición">
            <IconButton size="small" onClick={onCancelEdit}>
              <CloseOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {onEdit && !isActiveRow && !isEditing && (
          <Tooltip title="Editar alcances">
            <IconButton size="small" onClick={onEdit}>
              <EditOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {onView && isActiveRow && (
          <Tooltip title="Ver alcances">
            <IconButton size="small" onClick={onView}>
              <VisibilityOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
            }}
          >
            {!isEditing && onMoveUp && (
              <Tooltip title="Mover arriba">
                <span>
                  <IconButton
                    size="small"
                    onClick={onMoveUp}
                    disabled={moveUpDisabled}
                  >
                    <KeyboardArrowUpOutlined fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {!isEditing && onMoveDown && (
              <Tooltip title="Mover abajo">
                <span>
                  <IconButton
                    size="small"
                    onClick={onMoveDown}
                    disabled={moveDownDisabled}
                  >
                    <KeyboardArrowDownOutlined fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        </>
        {!isEditing && onConfigureVariables && !isActiveRow && (
          <Tooltip title="Configurar variables">
            <span className="content-center">
              <IconButton size="small" onClick={onConfigureVariables}>
                <TuneOutlined fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {!isEditing && onDuplicate && (
          <Tooltip title="Duplicar">
            <IconButton size="small" onClick={onDuplicate}>
              <ContentCopyOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {!isEditing && onDelete && (
          <Tooltip title={resolvedDeleteTooltipTitle}>
            <span className="content-center">
              <IconButton
                size="small"
                onClick={() => setDeleteOpen(true)}
                disabled={isDeleteDisabled}
              >
                <DeleteOutlined fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>

      {renderDeleteDialog ? (
        renderDeleteDialog({
          open: deleteOpen,
          onCancel: () => setDeleteOpen(false),
          onConfirm: () => {
            setDeleteOpen(false);
            onDelete?.();
          },
        })
      ) : (
        <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>
            <DialogContentText>{deleteConfirmMessage}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                setDeleteOpen(false);
                onDelete?.();
              }}
              color="primary"
              variant="contained"
            >
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};
