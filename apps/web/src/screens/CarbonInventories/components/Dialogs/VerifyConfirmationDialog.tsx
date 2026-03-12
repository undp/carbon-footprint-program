import { FC, useCallback, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormHelperText,
  IconButton,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { FormFileUpload } from "@/components";

interface VerifyFormValues {
  files: File[];
  sworn: boolean;
}

interface VerifyConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (files: File[]) => void | Promise<void>;
  isLoading: boolean;
}

export const VerifyConfirmationDialog: FC<VerifyConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  isLoading,
}) => {
  const { control, handleSubmit, reset } = useForm<VerifyFormValues>({
    defaultValues: { files: [], sworn: false },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = useCallback(
    async (data: VerifyFormValues) => {
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
      aria-labelledby="verify-dialog-title"
      aria-describedby="verify-dialog-description"
      slotProps={{
        paper: { sx: { borderRadius: 1 } },
      }}
    >
      <DialogTitle id="verify-dialog-title" sx={{ pr: 6, fontWeight: 600 }}>
        Enviar para Verificación
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
          <DialogContentText id="verify-dialog-description" sx={{ mb: 2 }}>
            ¿Estás seguro de que deseas enviar esta huella de carbono para
            verificación? Una vez enviada, no podrás realizar más cambios hasta
            que el proceso de verificación se complete.
          </DialogContentText>

          <Divider sx={{ mb: 2 }} />

          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
            Documentos de respaldo
          </Typography>

          <FormFileUpload
            control={control}
            name="files"
            disabled={isLoading}
            required
            requiredMessage="Debes adjuntar al menos un documento de respaldo"
            accept={{
              "image/png": [".png"],
              "image/jpeg": [".jpg", ".jpeg"],
              "application/pdf": [".pdf"],
            }}
          />

          <Controller
            name="sworn"
            control={control}
            rules={{
              validate: (val) =>
                val || "Debes aceptar la declaración jurada para continuar",
            }}
            render={({ field, fieldState }) => (
              <>
                <FormControlLabel
                  sx={{ mt: 2, alignItems: "flex-start" }}
                  control={
                    <Checkbox
                      checked={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                      sx={{ mt: -0.5 }}
                    />
                  }
                  label={
                    <Typography variant="body2">
                      Declaro bajo juramento que toda la información
                      proporcionada en esta postulación es verídica y está
                      respaldada por documentación oficial. Entiendo que
                      cualquier falsedad puede resultar en sanciones
                      administrativas y la anulación del proceso de
                      verificación.
                    </Typography>
                  }
                />
                {fieldState.error && (
                  <FormHelperText error role="alert" sx={{ mx: 0 }}>
                    {fieldState.error.message}
                  </FormHelperText>
                )}
              </>
            )}
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
            Enviar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
