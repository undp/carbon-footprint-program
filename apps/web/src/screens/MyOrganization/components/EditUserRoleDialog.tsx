import { FC, useCallback, useEffect, useRef } from "react";
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
import { useForm } from "react-hook-form";
import { FormSelectField } from "@/components/form/FormSelectField";
import { EditUserRoleFormData } from "../types";
import { ROLE_OPTIONS } from "../constants";
import { OrganizationRole } from "@repo/types";

interface EditUserRoleDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: EditUserRoleFormData) => void;
  currentRole?: OrganizationRole | null;
  userEmail?: string | null;
  isSubmitting?: boolean;
}

export const EditUserRoleDialog: FC<EditUserRoleDialogProps> = ({
  open,
  onClose,
  onSubmit,
  currentRole,
  userEmail,
  isSubmitting = false,
}) => {
  const { control, handleSubmit, reset } = useForm<EditUserRoleFormData>();

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleFormSubmit = useCallback(
    (data: EditUserRoleFormData) => {
      onSubmit(data);
    },
    [onSubmit]
  );

  // Focus management
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      if (currentRole) reset({ role: currentRole });
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [open, currentRole, reset]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 1,
          },
        },
      }}
      aria-labelledby="edit-user-role-dialog-title"
    >
      <DialogTitle
        id="edit-user-role-dialog-title"
        sx={{ pr: 6, fontWeight: 600, fontSize: 24 }}
      >
        Editar Rol de Usuario
      </DialogTitle>
      <IconButton
        aria-label="cerrar"
        onClick={handleClose}
        sx={(theme) => ({
          position: "absolute",
          right: 16,
          top: 16,
          color: theme.palette.grey[500],
        })}
      >
        <Close />
      </IconButton>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent sx={{ pt: 0 }}>
          {userEmail && (
            <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
              Usuario: <strong>{userEmail}</strong>
            </Typography>
          )}

          <FormSelectField
            name="role"
            control={control}
            label="Rol"
            options={ROLE_OPTIONS}
            required
            autoFocus
          />
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
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitting}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={20} color="inherit" />
              ) : undefined
            }
          >
            Guardar cambios
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
