import { FC } from "react";
import { Button, Paper } from "@mui/material";
import { SaveOutlined, CloseOutlined } from "@mui/icons-material";

interface Props {
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  saveDisabled?: boolean;
}

export const EditFooter: FC<Props> = ({
  onSave,
  onCancel,
  isSaving,
  saveLabel = "Guardar",
  cancelLabel = "Cancelar",
  saveDisabled,
}) => (
  <Paper
    elevation={4}
    sx={{
      position: "sticky",
      bottom: 0,
      left: 0,
      right: 0,
      px: 3,
      py: 1.5,
      display: "flex",
      justifyContent: "flex-end",
      gap: 2,
      zIndex: 10,
      borderRadius: 0,
      mt: 2,
    }}
  >
    <Button
      variant="outlined"
      startIcon={<CloseOutlined />}
      onClick={onCancel}
      disabled={isSaving}
    >
      {cancelLabel}
    </Button>
    <Button
      variant="contained"
      startIcon={<SaveOutlined />}
      onClick={onSave}
      disabled={isSaving || saveDisabled}
    >
      {saveLabel}
    </Button>
  </Paper>
);
