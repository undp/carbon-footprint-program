import { FC, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { AutoAwesome, Close, InfoOutlined } from "@mui/icons-material";
import { FormSwornDeclarationField } from "@/components/form";
import { VOCAB } from "@/config/vocab";

interface FormValues {
  sworn: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isLoading: boolean;
  isAutomaticRecognition: boolean;
}

export const SelfDeclareCarbonInventoryDialog: FC<Props> = ({
  open,
  onClose,
  onConfirm,
  isLoading,
  isAutomaticRecognition,
}) => {
  const theme = useTheme();
  const { control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { sworn: false },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = useCallback(async () => {
    await onConfirm();
  }, [onConfirm]);

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="self-declare-dialog-title"
      slotProps={{
        paper: { sx: { borderRadius: 1 } },
      }}
    >
      <DialogTitle
        id="self-declare-dialog-title"
        sx={{ pr: 6, fontWeight: 600 }}
      >
        Autodeclarar Huella de Carbono
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
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent sx={{ pt: 0 }}>
          {/* Congratulations info box */}
          <Box
            sx={{
              background: alpha(theme.palette.info.main, 0.1),
              border: `1px solid ${alpha(theme.palette.info.light, 0.5)}`,
              borderRadius: 2,
              p: 2.5,
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <AutoAwesome
                sx={{ color: theme.palette.info.dark }}
                fontSize="small"
              />
              <Typography
                variant="subtitle2"
                fontWeight={600}
                sx={{ color: theme.palette.info.dark }}
              >
                ¡Felicitaciones por completar el cálculo de tu Huella de
                Carbono!
              </Typography>
            </Box>

            {isAutomaticRecognition && (
              <Box sx={{ mt: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ mb: 1.5, color: theme.palette.info.dark }}
                >
                  Al <strong>autodeclarar</strong> tu huella de carbono,
                  recibirás automáticamente un{" "}
                  <strong>Reconocimiento de Medición</strong> que reconoce que
                  tu {VOCAB.organization.noun.singular} ha calculado sus
                  emisiones de gases de efecto invernadero.
                </Typography>

                <Box
                  sx={{
                    background: alpha(theme.palette.info.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.info.light, 1)}`,
                    borderRadius: 1.5,
                    p: 1.5,
                    mb: 1.5,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1,
                  }}
                >
                  <InfoOutlined
                    sx={{ color: theme.palette.info.dark, mt: 0.25 }}
                    fontSize="small"
                  />
                  <Box>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{ color: theme.palette.info.dark }}
                    >
                      Importante:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: theme.palette.info.dark }}
                    >
                      El reconocimiento de medición{" "}
                      <strong>NO es un reconocimiento oficial</strong> ni
                      certifica que la medición haya sido verificada por Huella
                      Latam. Es una felicitación por el esfuerzo de realizar el
                      cálculo.
                    </Typography>
                  </Box>
                </Box>

                <Typography
                  sx={{
                    color: theme.palette.info.dark,
                  }}
                  variant="body2"
                >
                  Si deseas obtener el{" "}
                  <strong>Reconocimiento de Verificación</strong>{" "}
                  (reconocimiento oficial), podrás postular tu huella al proceso
                  de verificación gubernamental desde la sección &quot;Mis
                  huellas&quot; una vez que hayas autodeclarado.
                </Typography>
              </Box>
            )}
          </Box>

          {/* Sworn checkbox */}
          <FormSwornDeclarationField
            name="sworn"
            control={control}
            disabled={isLoading}
            errorMessage="Debes aceptar la declaración para continuar"
            label={
              <Typography variant="body2">
                Declaro que los datos del cálculo de huella de carbono
                corresponden a la {VOCAB.organization.noun.singular} mencionada
                y comprendo que este es un reconocimiento por realizar la
                medición, y no constituye una certificación oficial ni
                verificación por parte de Huella Latam.
              </Typography>
            }
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
            Autodeclarar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
