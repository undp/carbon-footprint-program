import { FC } from "react";
import { Box, CircularProgress, Fab, Tooltip, Zoom } from "@mui/material";
import { SaveRounded } from "@mui/icons-material";

interface FloatingSaveButtonProps {
  isDirty: boolean;
  isSaving: boolean;
  disabled: boolean;
  onSave: () => void;
}

/**
 * Floating save action for the emission capture step. It only appears while
 * there is something to save (or a save is in flight), so it never covers the
 * grid without purpose — the always-visible dirty/saved copy lives next to the
 * step title instead.
 */
export const FloatingSaveButton: FC<FloatingSaveButtonProps> = ({
  isDirty,
  isSaving,
  disabled,
  onSave,
}) => (
  <Zoom in={isDirty || isSaving} unmountOnExit>
    <Box className="absolute right-8 bottom-6 z-10">
      <Tooltip title="Guardar cambios" placement="left">
        <span>
          <Fab
            color="primary"
            size="medium"
            aria-label="Guardar cambios"
            onClick={onSave}
            disabled={disabled || isSaving}
          >
            {isSaving ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              <SaveRounded />
            )}
          </Fab>
        </span>
      </Tooltip>
    </Box>
  </Zoom>
);
