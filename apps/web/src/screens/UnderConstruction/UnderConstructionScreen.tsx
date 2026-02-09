import { FC } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";

export const UnderConstructionScreen: FC = () => {
  const theme = useTheme();
  return (
    <Box
      className="flex min-h-0 flex-1 items-center justify-center"
      sx={{
        backgroundColor: theme.palette.background.default,
      }}
    >
      <Box className="mb-2 flex h-80 w-80 flex-col items-center justify-center rounded-4xl bg-white p-2">
        <HandymanOutlinedIcon sx={{ fontSize: 125 }} />
        <Typography variant="h4">En construcción</Typography>
      </Box>
    </Box>
  );
};
