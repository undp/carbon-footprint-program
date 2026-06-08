import { FC, ReactNode, useState } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import {
  SettingsOutlined,
  VisibilityOutlined,
  ContentCopyOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  KeyboardArrowUpOutlined,
  KeyboardArrowDownOutlined,
  TuneOutlined,
  FileDownloadOutlined,
} from "@mui/icons-material";
import { AdminActionButton } from "@/components/AdminActionButton";

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
  onDownloadExcel?: () => void;
  editDisabled?: boolean;
  editTooltipTitle?: string;
  duplicateDisabled?: boolean;
  duplicateTooltipTitle?: string;
  moveUpDisabled?: boolean;
  moveDownDisabled?: boolean;
  downloadExcelDisabled?: boolean;
  downloadExcelTooltipTitle?: string;
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
  onDownloadExcel,
  editDisabled = false,
  editTooltipTitle,
  duplicateDisabled = false,
  duplicateTooltipTitle,
  moveUpDisabled = false,
  moveDownDisabled = false,
  downloadExcelDisabled = false,
  downloadExcelTooltipTitle = "Descargar",
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
      <Box className="flex justify-end gap-1">
        {isEditing && onStopEditCells && (
          <AdminActionButton
            icon={SaveOutlined}
            tooltip="Guardar cambios"
            onClick={onStopEditCells}
          />
        )}
        {isEditing && onCancelEdit && (
          <AdminActionButton
            icon={CloseOutlined}
            tooltip="Cancelar edición"
            onClick={onCancelEdit}
          />
        )}
        {onEdit && !isActiveRow && !isEditing && (
          <AdminActionButton
            icon={SettingsOutlined}
            tooltip={
              editDisabled && editTooltipTitle
                ? editTooltipTitle
                : "Ajustar metodología"
            }
            onClick={onEdit}
            disabled={editDisabled}
          />
        )}
        {onView && isActiveRow && (
          <AdminActionButton
            icon={VisibilityOutlined}
            tooltip="Ver alcances"
            onClick={onView}
          />
        )}
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
          }}
        >
          {!isEditing && onMoveUp && (
            <AdminActionButton
              icon={KeyboardArrowUpOutlined}
              tooltip="Mover arriba"
              onClick={onMoveUp}
              disabled={moveUpDisabled}
            />
          )}
          {!isEditing && onMoveDown && (
            <AdminActionButton
              icon={KeyboardArrowDownOutlined}
              tooltip="Mover abajo"
              onClick={onMoveDown}
              disabled={moveDownDisabled}
            />
          )}
        </Box>
        {!isEditing && onConfigureVariables && !isActiveRow && (
          <AdminActionButton
            icon={TuneOutlined}
            tooltip="Configurar variables"
            onClick={onConfigureVariables}
          />
        )}
        {!isEditing && onDuplicate && (
          <AdminActionButton
            icon={ContentCopyOutlined}
            tooltip={
              duplicateDisabled && duplicateTooltipTitle
                ? duplicateTooltipTitle
                : "Duplicar"
            }
            onClick={onDuplicate}
            disabled={duplicateDisabled}
          />
        )}
        {!isEditing && onDownloadExcel && (
          <AdminActionButton
            icon={FileDownloadOutlined}
            tooltip={downloadExcelTooltipTitle}
            onClick={onDownloadExcel}
            disabled={downloadExcelDisabled}
          />
        )}
        {!isEditing && onDelete && (
          <AdminActionButton
            icon={DeleteOutlined}
            tooltip={resolvedDeleteTooltipTitle}
            onClick={() => setDeleteOpen(true)}
            disabled={isDeleteDisabled}
          />
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
