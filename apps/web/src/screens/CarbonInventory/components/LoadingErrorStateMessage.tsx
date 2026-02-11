import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { WarningOutlined } from "@mui/icons-material";

interface LoadingErrorStateMessageProps {
  className?: string;
  message?: string;
}

export const LoadingErrorStateMessage: FC<LoadingErrorStateMessageProps> = ({
  className,
  message = "Ocurrió un error al cargar esta sección",
}) => {
  const theme = useTheme();

  return (
    <Box
      className={`flex h-full w-full flex-col items-center justify-center rounded-lg px-4 ${className ?? ""}`}
      sx={{
        backgroundColor: alpha(theme.palette.text.primary, 0.03),
      }}
    >
      <WarningOutlined color="warning" />

      <Typography
        className="max-w-[70%] py-1 text-center"
        variant="body2"
        color={"warning"}
      >
        {message}
      </Typography>
    </Box>
  );
};
