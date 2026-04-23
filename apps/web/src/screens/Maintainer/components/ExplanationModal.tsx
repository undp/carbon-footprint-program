import { FC, lazy, Suspense, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  CircularProgress,
  Typography,
} from "@mui/material";
import { ExplanationContent } from "@/components/ExplanationContent";

const MarkdownEditor = lazy(
  () => import("@/components/markdown/MarkdownEditor")
);

interface ExplanationModalProps {
  open: boolean;
  value: string;
  readOnly?: boolean;
  onSave: (value: string) => void;
  onClose: () => void;
}

const ExplanationModalContent: FC<Omit<ExplanationModalProps, "open">> = ({
  value,
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
      <DialogContent>
        {readOnly ? (
          <ExplanationContent content={value} />
        ) : (
          <>
            <Typography
              variant="body2"
              component="label"
              sx={{ display: "block", mb: 1, color: "text.secondary" }}
            >
              Explicación
            </Typography>
            <Suspense
              fallback={
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  minHeight={480}
                >
                  <CircularProgress />
                </Box>
              }
            >
              <MarkdownEditor value={localValue} onChange={setLocalValue} />
            </Suspense>
          </>
        )}
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
    maxWidth="xl"
    fullWidth
    slotProps={{
      paper: {
        sx: {
          overflow: "hidden",
        },
      },
    }}
  >
    {open && <ExplanationModalContent {...contentProps} />}
  </Dialog>
);
