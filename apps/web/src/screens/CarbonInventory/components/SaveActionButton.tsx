import { FC } from "react";
import { CircularProgress } from "@mui/material";
import { SaveOutlined } from "@mui/icons-material";
import { BaseActionButton } from "@/components/BaseActionButton";

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
 * user.
 *
 * Built straight on `BaseActionButton` rather than on `AppActionButton` (as the
 * chatbot header actions do): this is a title-row action, not a datagrid one, so
 * it mirrors the borderless weight of the `InfoButton` sitting a few pixels to
 * its left instead of the bordered 30x30 box used inside tables.
 */
export const SaveActionButton: FC<SaveActionButtonProps> = ({
  isDirty,
  isSaving,
  disabled,
  onSave,
}) => (
  <BaseActionButton
    tooltip={isDirty ? "Guardar cambios" : "No hay cambios para guardar"}
    onClick={onSave}
    disabled={disabled || isSaving || !isDirty}
    color="primary"
  >
    {isSaving ? (
      <CircularProgress size={16} color="inherit" />
    ) : (
      <SaveOutlined fontSize="small" />
    )}
  </BaseActionButton>
);
