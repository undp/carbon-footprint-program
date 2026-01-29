import { FC } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";

export const UnderConstructionScreen: FC = () => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        flexGrow: 1,
        backgroundColor: theme.palette.background.default,
      }}
    >
      <Box
        sx={{
          borderRadius: 10,
          bgcolor: "white",
          p: 2,
          mb: 2,
          width: 300,
          height: 300,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <HandymanOutlinedIcon sx={{ fontSize: 125 }} />
        <Typography variant="h4">En construcción</Typography>
      </Box>
    </Box>
  );
};
