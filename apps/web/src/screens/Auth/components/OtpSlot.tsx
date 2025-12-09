import { FC } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { SlotProps } from "input-otp";

interface Props extends SlotProps {
  error?: boolean;
}

export const OtpSlot: FC<Props> = ({
  char,
  placeholderChar,
  isActive,
  hasFakeCaret,
  error,
}) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        position: "relative",
        width: 40,
        height: 56,
        borderRadius: 1,
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: error
          ? theme.palette.error.main
          : isActive
            ? theme.palette.primary.main
            : theme.palette.divider,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.5rem",
        bgcolor: theme.palette.background.paper,
      }}
    >
      <Typography
        component="span"
        sx={{
          opacity: char ? 1 : 0.4,
        }}
      >
        {char ?? placeholderChar ?? "•"}
      </Typography>

      {hasFakeCaret && (
        <Box
          sx={{
            position: "absolute",
            bottom: 8,
            width: 26,
            height: 2,
            bgcolor: theme.palette.primary.main,
            animation: "muiOtpCaretBlink 1.1s ease-out infinite",
          }}
        />
      )}
    </Box>
  );
};
