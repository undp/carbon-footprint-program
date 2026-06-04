import { FC, ReactNode, useState } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  IconButton,
  Tooltip,
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
import { ActionIconButton } from "@/components/ActionIconButton";

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
          <ActionIconButton
            icon={SaveOutlined}
            tooltip="Guardar cambios"
            onClick={onStopEditCells}
          />
        )}
        {isEditing && onCancelEdit && (
          <ActionIconButton
            icon={CloseOutlined}
            tooltip="Cancelar edición"
            onClick={onCancelEdit}
          />
        )}
        {onEdit && !isActiveRow && !isEditing && (
          <ActionIconButton
            icon={SettingsOutlined}
            tooltip="Ajustar metodología"
            onClick={onEdit}
          />
        )}
        {onView && isActiveRow && (
          <ActionIconButton
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
            <ActionIconButton
              icon={KeyboardArrowUpOutlined}
              tooltip="Mover arriba"
              onClick={onMoveUp}
              disabled={moveUpDisabled}
            />
          )}
          {!isEditing && onMoveDown && (
            <ActionIconButton
              icon={KeyboardArrowDownOutlined}
              tooltip="Mover abajo"
              onClick={onMoveDown}
              disabled={moveDownDisabled}
            />
          )}
        </Box>
        {!isEditing && onConfigureVariables && !isActiveRow && (
          <ActionIconButton
            icon={TuneOutlined}
            tooltip="Configurar variables"
            onClick={onConfigureVariables}
          />
        )}
        {!isEditing && onDuplicate && (
          <ActionIconButton
            icon={ContentCopyOutlined}
            tooltip="Duplicar"
            onClick={onDuplicate}
          />
        )}
        {!isEditing && onDownloadExcel && (
          <Tooltip title={downloadExcelTooltipTitle}>
            <span className="content-center">
              <IconButton
                size="small"
                onClick={onDownloadExcel}
                disabled={downloadExcelDisabled}
                aria-label={downloadExcelTooltipTitle}
              >
                <FileDownloadOutlined fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {!isEditing && onDelete && (
          <ActionIconButton
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
