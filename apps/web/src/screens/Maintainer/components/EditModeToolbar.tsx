import { FC } from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import { FiberManualRecord as DotIcon } from "@mui/icons-material";

export const EDIT_MODE_TOOLBAR_HEIGHT = 64;

interface EditModeToolbarProps {
  methodologyName: string;
  /** Shown under the name when the mode needs qualifying — see the published
   * methodology, where a change reaches capture as soon as it is saved. */
  note?: string;
  onExitClick: () => void;
}

export const EditModeToolbar: FC<EditModeToolbarProps> = ({
  methodologyName,
  note,
  onExitClick,
}) => (
  <Paper
    elevation={0}
    sx={{
      minHeight: EDIT_MODE_TOOLBAR_HEIGHT,
      position: "sticky",
      bottom: 3,
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      px: 4,
      py: 1,
      border: "2px solid",
      borderColor: "success.main",
    }}
  >
    <DotIcon sx={{ fontSize: 12, color: "success.main" }} />
    <Box sx={{ flex: 1 }}>
      <Typography variant="body2" fontWeight={600}>
        Editando: {methodologyName}
      </Typography>
      {note && (
        <Typography variant="caption" color="text.secondary">
          {note}
        </Typography>
      )}
    </Box>
    <Button
      size="small"
      variant="contained"
      color="primary"
      onClick={onExitClick}
    >
      Salir de modo edición
    </Button>
  </Paper>
);
