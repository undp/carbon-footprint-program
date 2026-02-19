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
  CloseOutlined,
  KeyboardArrowUpOutlined,
  KeyboardArrowDownOutlined,
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
  moveUpDisabled?: boolean;
  moveDownDisabled?: boolean;
  deleteConfirmMessage?: string;
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
  moveUpDisabled = false,
  moveDownDisabled = false,
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
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            {!isEditing && onMoveUp && (
              <Tooltip title="Mover arriba" placement="top">
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
        {!isEditing && onDuplicate && (
          <Tooltip title="Duplicar">
            <IconButton size="small" onClick={onDuplicate}>
              <ContentCopyOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {!isEditing && onDelete && (
          <Tooltip title="Eliminar">
            <span className="content-center">
              <IconButton
                size="small"
                onClick={() => setDeleteOpen(true)}
                disabled={isActiveRow}
              >
                <DeleteOutlined fontSize="small" />
              </IconButton>
            </span>
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
