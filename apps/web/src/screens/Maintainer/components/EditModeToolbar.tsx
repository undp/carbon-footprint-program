import { FC } from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import { FiberManualRecord as DotIcon } from "@mui/icons-material";

interface EditModeToolbarProps {
  methodologyName: string;
  onExitClick: () => void;
}

export const EditModeToolbar: FC<EditModeToolbarProps> = ({
  methodologyName,
  onExitClick,
}) => (
  <Paper
    elevation={3}
    sx={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      px: 4,
      py: 1.5,
      zIndex: 1200,
      borderTop: "2px solid",
      borderColor: "success.main",
    }}
  >
    <DotIcon sx={{ fontSize: 12, color: "success.main" }} />
    <Box sx={{ flex: 1 }}>
      <Typography variant="body2" fontWeight={600}>
        Editando: {methodologyName}
      </Typography>
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
