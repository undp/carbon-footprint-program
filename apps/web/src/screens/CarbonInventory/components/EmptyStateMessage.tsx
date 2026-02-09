import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

interface EmptyStateMessageProps {
  color?: "primary" | "default";
  message: string;
}

export const EmptyStateMessage: FC<EmptyStateMessageProps> = ({
  color = "default",
  message,
}) => {
  const theme = useTheme();

  return (
    <Box
      className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg p-4"
      sx={{
        backgroundColor:
          color === "primary"
            ? alpha(theme.palette.primary.main, 0.03)
            : alpha(theme.palette.text.primary, 0.03),
      }}
    >
      <Typography
        className="max-w-[70%] py-4 text-center"
        variant="body2"
        color={color === "primary" ? "primary" : "text.secondary"}
      >
        {message}
      </Typography>
    </Box>
  );
};
