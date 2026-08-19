import { FC } from "react";
import { CircularProgress } from "@mui/material";
import { SaveOutlined } from "@mui/icons-material";
import { AppActionButton } from "@/components";

interface SaveActionButtonProps {
  isDirty: boolean;
  isSaving: boolean;
  disabled: boolean;
  onSave: () => void;
}

/**
 * Save action for the emission capture step, rendered right before the
 * save-status copy in the step header. It stays in place at all times, enabled
 * only while there are changes to persist, so the affordance never moves on the
 * user. Outlined like the other icon actions on the screen.
 */
export const SaveActionButton: FC<SaveActionButtonProps> = ({
  isDirty,
  isSaving,
  disabled,
  onSave,
}) => (
  <AppActionButton
    tooltip={isDirty ? "Guardar cambios" : "No hay cambios para guardar"}
    onClick={onSave}
    disabled={disabled || isSaving || !isDirty}
  >
    {isSaving ? (
      <CircularProgress size={16} color="inherit" />
    ) : (
      <SaveOutlined fontSize="small" />
    )}
  </AppActionButton>
);
