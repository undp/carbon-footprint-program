import { FC, useCallback, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { useForm } from "react-hook-form";
import { FormTextField } from "@/components/form/FormTextField";
import { FormSelectField } from "@/components/form/FormSelectField";
import { AddUserFormData } from "../types";
import { ROLE_OPTIONS } from "../constants";

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AddUserFormData) => void;
  isSubmitting?: boolean;
}

export const AddUserDialog: FC<AddUserDialogProps> = ({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const { control, handleSubmit, reset } = useForm<AddUserFormData>({
    defaultValues: {
      email: "",
      role: "",
    },
  });

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleFormSubmit = useCallback(
    (data: AddUserFormData) => {
      onSubmit(data);
    },
    [onSubmit]
  );

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
      aria-labelledby="add-user-dialog-title"
    >
      <DialogTitle
        id="add-user-dialog-title"
        sx={{ pr: 6, fontWeight: 600, fontSize: 24 }}
      >
        Agregar Usuario
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

      <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
        <DialogContent sx={{ pt: 0 }}>
          <FormTextField
            name="email"
            control={control}
            label="Correo electrónico"
            type="email"
            required
            requiredMessage="El correo electrónico es obligatorio"
            autoFocus
          />

          <FormSelectField
            name="role"
            control={control}
            label="Rol"
            options={ROLE_OPTIONS}
            required
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
            Agregar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
