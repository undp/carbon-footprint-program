import { FC, useState } from "react";
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
} from "@mui/icons-material";

interface ActionButtonProps {
  isActiveRow: boolean;
  isEditing?: boolean;
  onStopEditCells?: () => void;
  onEdit?: () => void;
  onView?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  deleteConfirmMessage?: string;
}

export const ActionButtons: FC<ActionButtonProps> = ({
  isActiveRow,
  isEditing = false,
  onStopEditCells,
  onEdit,
  onView,
  onDuplicate,
  onDelete,
  deleteConfirmMessage = "¿Estás seguro de que deseas eliminar este registro?",
}) => {
  const [deleteOpen, setDeleteOpen] = useState(false);

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
        {onDuplicate && (
          <Tooltip title="Duplicar">
            <IconButton size="small" onClick={onDuplicate}>
              <ContentCopyOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {onDelete && (
          <Tooltip title="Eliminar">
            <IconButton
              size="small"
              onClick={() => setDeleteOpen(true)}
              disabled={isActiveRow}
            >
              <DeleteOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

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
            color="error"
            variant="contained"
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
