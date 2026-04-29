import { FC, ReactNode, SyntheticEvent, useCallback, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
} from "@mui/material";
import { ExplanationEditorTab } from "./ExplanationModal/ExplanationEditorTab";
import { ExplanationPreviewTab } from "./ExplanationModal/ExplanationPreviewTab";

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

type TabValue = "edit" | "preview";

const ExplanationModalContent: FC<Omit<ExplanationModalProps, "open">> = ({
  value,
  title = "Editar Explicación",
  subtitle,
  readOnly = false,
  loading = false,
  onSave,
  onClose,
}) => {
  const [content, setContent] = useState(value);
  const [tab, setTab] = useState<TabValue>(readOnly ? "preview" : "edit");

  const handleTabChange = (_event: SyntheticEvent, next: TabValue) => {
    setTab(next);
  };

  const isDirty = content !== value;

  const handleSave = useCallback(async () => {
    if (!isDirty) {
      onClose();
      return;
    }
    try {
      await onSave(content);
      onClose();
    } catch {
      // Parent surfaces the error; keep the modal open so edits are not lost.
    }
  }, [content, isDirty, onClose, onSave]);

  return (
    <>
      <DialogTitle>{readOnly ? "Ver Explicación" : title}</DialogTitle>
      <DialogContent
        sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
      >
        {subtitle}
        <Tabs
          value={tab}
          onChange={handleTabChange}
          sx={(theme) => ({
            minHeight: 0,
            "& .MuiTabs-indicator": {
              backgroundColor: theme.palette.primary.main,
              height: 2,
            },
            "& .MuiTab-root": {
              textTransform: "none",
              minHeight: 40,
              fontWeight: 500,
              fontSize: "0.875rem",
              color: theme.palette.text.secondary,
              "&.Mui-selected": { color: theme.palette.primary.dark },
            },
          })}
        >
          {!readOnly && <Tab value="edit" label="Editar" />}
          <Tab value="preview" label="Vista Previa" />
        </Tabs>
        <Box
          sx={{
            mt: 1,
            height: "60vh",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {tab === "edit" && !readOnly ? (
            <ExplanationEditorTab
              value={content}
              onChange={setContent}
              disabled={loading}
            />
          ) : (
            <ExplanationPreviewTab content={content} />
          )}
        </Box>
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
    maxWidth="lg"
    fullWidth
    slotProps={{ paper: { sx: { maxHeight: "90vh" } } }}
  >
    {open && <ExplanationModalContent {...contentProps} />}
  </Dialog>
);
