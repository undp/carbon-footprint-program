import { FC } from "react";
import { Box, Typography } from "@mui/material";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";

export const UnderConstructionScreen: FC = () => {
  return (
    <Box className="flex min-h-0 flex-1 items-center justify-center">
      <Box className="mb-2 flex h-80 w-80 flex-col items-center justify-center rounded-4xl p-2 opacity-50">
        <HandymanOutlinedIcon sx={{ fontSize: 125 }} />
        <Typography variant="h4">En construcción</Typography>
      </Box>
    </Box>
  );
};
