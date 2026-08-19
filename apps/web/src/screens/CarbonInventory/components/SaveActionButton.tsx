import { FC } from "react";
import { CircularProgress } from "@mui/material";
import { SaveRounded } from "@mui/icons-material";
import { AppActionButton, primaryActionButtonSx } from "@/components";

interface SaveActionButtonProps {
  isDirty: boolean;
  isSaving: boolean;
  disabled: boolean;
  onSave: () => void;
}

/**
 * Save action for the emission capture step, rendered next to the save-status
 * copy in the step header. It stays in place at all times — filled while there
 * are changes to persist, disabled once everything is saved — so the affordance
 * never moves on the user.
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
    sx={isDirty ? primaryActionButtonSx : undefined}
  >
    {isSaving ? (
      <CircularProgress size={16} color="inherit" />
    ) : (
      <SaveRounded fontSize="small" />
    )}
  </AppActionButton>
);
