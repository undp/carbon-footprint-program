import { FC, useEffect, useRef } from "react";
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

export interface ConfirmDialogProps {
  // Dialog state
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;

  // Content
  title: string;
  message: string;
  description?: string;

  // Customization
  variant?: "warning" | "error" | "info" | "success";
  confirmLabel?: string;
  cancelLabel?: string;

  // State
  isLoading?: boolean;
}

export const ConfirmDialog: FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  description,
  variant = "warning",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  isLoading = false,
}) => {
  // Focus management
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [open]);

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
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle
        id="confirm-dialog-title"
        sx={{ pr: 6, fontWeight: 600, fontSize: 24 }}
      >
        {title}
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
        <Typography variant="body1" id="confirm-dialog-description">
          {message}
        </Typography>
        {description && (
          <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
            {description}
          </Typography>
        )}
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
          disabled={isLoading}
          autoFocus
        >
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={variant}
          disabled={isLoading}
          startIcon={
            isLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : undefined
          }
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
