import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { BrokenImageOutlined } from "@mui/icons-material";

export const InactiveBadgeCardContent: FC = () => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      border: "2px dashed",
      borderColor: "divider",
      borderRadius: 2,
      textAlign: "center",
    }}
  >
    <BrokenImageOutlined sx={{ fontSize: 36, color: "text.disabled", mb: 1 }} />
    <Typography variant="body2" color="text.disabled" display="block" mb={1.5}>
      No hay sello activo
    </Typography>
  </Box>
);
