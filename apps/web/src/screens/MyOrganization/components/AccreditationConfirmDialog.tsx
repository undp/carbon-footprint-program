import { FC, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { FormFileUpload } from "@/components";
import { VOCAB } from "@/config/vocab";

interface AccreditationFormValues {
  files: File[];
}

interface AccreditationConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (files: File[]) => void | Promise<void>;
  isLoading: boolean;
}

export const AccreditationConfirmDialog: FC<
  AccreditationConfirmDialogProps
> = ({ open, onClose, onConfirm, isLoading }) => {
  const { control, handleSubmit, reset } = useForm<AccreditationFormValues>({
    defaultValues: { files: [] },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = useCallback(
    async (data: AccreditationFormValues) => {
      await onConfirm(data.files);
    },
    [onConfirm]
  );

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: 1 } },
      }}
    >
      <DialogTitle sx={{ pr: 6, fontWeight: 600 }}>
        {`Solicitar ${VOCAB.inscription.noun.singular}`}
      </DialogTitle>

      <IconButton
        aria-label="cerrar"
        onClick={onClose}
        disabled={isLoading}
        sx={(theme) => ({
          position: "absolute",
          right: 16,
          top: 16,
          color: theme.palette.grey[500],
        })}
      >
        <Close />
      </IconButton>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            ¿Está seguro de que desea solicitar{" "}
            {VOCAB.inscription.article.singular} de su{" "}
            {VOCAB.organization.noun.singular}? Esta acción enviará una
            solicitud al administrador para revisar su{" "}
            {VOCAB.inscription.noun.singular}.
          </Typography>

          <Divider sx={{ mb: 2 }} />

          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
            Documentos de respaldo{" "}
            <Typography component="span" color="error">
              *
            </Typography>
          </Typography>

          <FormFileUpload
            control={control}
            name="files"
            useCase="SUBMISSION"
            disabled={isLoading}
            required
            requiredMessage="Al menos un archivo es requerido"
          />
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Button onClick={onClose} disabled={isLoading} color="inherit">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            loading={isLoading}
          >
            Solicitar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
