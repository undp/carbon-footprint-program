import { FC, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";

interface ExplanationModalProps {
  open: boolean;
  value: string;
  title?: string;
  readOnly?: boolean;
  onSave: (value: string) => void;
  onClose: () => void;
}

const ExplanationModalContent: FC<
  Omit<ExplanationModalProps, "open">
> = ({
  value,
  title = "Editar Explicación",
  readOnly = false,
  onSave,
  onClose,
}) => {
  const [localValue, setLocalValue] = useState(value);

  const handleSave = () => {
    onSave(localValue);
    onClose();
  };

  return (
    <>
      <DialogTitle>{readOnly ? "Ver Explicación" : title}</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          multiline
          minRows={8}
          maxRows={20}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder="Escribe la explicación aquí..."
          slotProps={{ input: { readOnly } }}
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
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="contained" onClick={handleSave}>
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
    onClose={contentProps.onClose}
    maxWidth="md"
    fullWidth
    PaperProps={{ sx: { maxHeight: "90vh" } }}
  >
    {open && <ExplanationModalContent {...contentProps} />}
  </Dialog>
);
