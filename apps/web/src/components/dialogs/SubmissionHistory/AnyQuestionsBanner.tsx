import { FC } from "react";
import { alpha, Box, Typography, useTheme } from "@mui/material";

export const AnyQuestionsBanner: FC = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        background: alpha(theme.palette.info.main, 0.1),
        border: `1px solid ${alpha(theme.palette.info.light, 0.5)}`,
        borderRadius: "10px",
        px: 1.5,
        py: 1.25,
      }}
    >
      <Typography variant="caption" sx={{ color: theme.palette.info.dark }}>
        <Box component="span" fontWeight={500}>
          Consultas:{" "}
        </Box>
        Para consultas sobre esta postulación, contacte a{" "}
        contacto@huellalatam.com indicando el número de expediente.
      </Typography>
    </Box>
  );
};
