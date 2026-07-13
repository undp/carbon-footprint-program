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
import { FormFileUpload, FormSwornDeclarationField } from "@/components/form";
import { RequiredDocumentsSection } from "@/screens/ReductionProject/components/RequiredDocumentsSection";

export interface PostulateReductionProjectFormValues {
  files: File[];
  sworn: boolean;
}

interface PostulateReductionProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (files: File[]) => void | Promise<void>;
  isLoading: boolean;
}

export const PostulateReductionProjectDialog: FC<
  PostulateReductionProjectDialogProps
> = ({ open, onClose, onConfirm, isLoading }) => {
  const { control, handleSubmit, reset } =
    useForm<PostulateReductionProjectFormValues>({
      defaultValues: { files: [], sworn: false },
    });

  const onSubmit = useCallback(
    async (data: PostulateReductionProjectFormValues) => {
      await onConfirm(data.files);
    },
    [onConfirm]
  );

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="postulate-reduction-project-dialog-title"
      slotProps={{
        paper: { sx: { borderRadius: 1 } },
      }}
    >
      <DialogTitle
        id="postulate-reduction-project-dialog-title"
        sx={{ pr: 6, fontWeight: 600 }}
      >
        Postular proyecto a Reconocimiento de Reducción
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
        <DialogContent className="flex flex-col gap-5 pt-0">
          <RequiredDocumentsSection />
          <Divider />
          <Typography variant="subtitle1" fontWeight={600}>
            Carga de archivos para la postulación
          </Typography>
          <FormFileUpload
            control={control}
            name="files"
            disabled={isLoading}
            required
            requiredMessage="Debes adjuntar al menos un documento antes de enviar la postulación."
          />
          <FormSwornDeclarationField
            name="sworn"
            control={control}
            disabled={isLoading}
            errorMessage="Debes aceptar la declaración jurada para continuar"
            label={
              <Typography variant="body2">
                Declaro bajo juramento que toda la información proporcionada en
                esta postulación es verídica y está respaldada por documentación
                oficial. Entiendo que cualquier falsedad puede resultar en
                sanciones administrativas y la anulación del reconocimiento de
                reducción.
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
            Enviar Postulación
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
