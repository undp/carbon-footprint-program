import { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  CircularProgress,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";

interface DeleteUserConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName?: string | null;
  isDeleting?: boolean;
}

export const DeleteUserConfirmationDialog: FC<
  DeleteUserConfirmationDialogProps
> = ({ open, onClose, onConfirm, userName, isDeleting = false }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 1,
          },
        },
      }}
      aria-labelledby="delete-user-dialog-title"
    >
      <DialogTitle
        id="delete-user-dialog-title"
        sx={{ pr: 6, fontWeight: 600, fontSize: 24 }}
      >
        Eliminar Usuario
      </DialogTitle>
      <IconButton
        aria-label="cerrar"
        onClick={onClose}
        sx={(theme) => ({
          position: "absolute",
          right: 16,
          top: 16,
          color: theme.palette.grey[500],
        })}
      >
        <Close />
      </IconButton>

      <DialogContent>
        <Typography variant="body1">
          ¿Estás seguro de que deseas eliminar al usuario{" "}
          {userName ? <strong>{userName}</strong> : "este usuario"}?
        </Typography>
        <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
          Esta acción no se puede deshacer.
        </Typography>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: 1,
          borderColor: "divider",
          backgroundColor: "background.paper",
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={isDeleting}
          autoFocus
        >
          Cancelar
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          disabled={isDeleting}
          startIcon={
            isDeleting ? (
              <CircularProgress size={20} color="inherit" />
            ) : undefined
          }
        >
          Eliminar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
