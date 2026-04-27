import { FC, ReactNode, useCallback, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  TextField,
} from "@mui/material";

interface ExplanationModalProps {
  open: boolean;
  value: string;
  title?: string;
  subtitle?: ReactNode;
  readOnly?: boolean;
  loading?: boolean;
  onSave: (value: string) => void | Promise<void>;
  onClose: () => void;
}

const ExplanationModalContent: FC<Omit<ExplanationModalProps, "open">> = ({
  value,
  title = "Editar Explicación",
  subtitle,
  readOnly = false,
  loading = false,
  onSave,
  onClose,
}) => {
  const [localValue, setLocalValue] = useState(value);

  const handleSave = useCallback(async () => {
    try {
      await onSave(localValue);
      onClose();
    } catch {
      // The parent surfaces the error; keep the modal open so edits are not lost.
    }
  }, [localValue, onClose, onSave]);

  return (
    <>
      <DialogTitle>{readOnly ? "Ver Explicación" : title}</DialogTitle>
      <DialogContent>
        {subtitle}
        <TextField
          fullWidth
          multiline
          minRows={8}
          maxRows={20}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder="Escribe la explicación aquí..."
          slotProps={{ input: { readOnly: readOnly || loading } }}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {readOnly ? (
          <Button variant="contained" onClick={onClose}>
            Cerrar
          </Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={loading}
              startIcon={
                loading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : undefined
              }
            >
              Guardar cambios
            </Button>
          </>
        )}
      </DialogActions>
    </>
  );
};

export const ExplanationModal: FC<ExplanationModalProps> = ({
  open,
  ...contentProps
}) => (
  <Dialog
    open={open}
    onClose={contentProps.loading ? undefined : contentProps.onClose}
    maxWidth="md"
    fullWidth
    PaperProps={{ sx: { maxHeight: "90vh" } }}
  >
    {open && <ExplanationModalContent {...contentProps} />}
  </Dialog>
);
