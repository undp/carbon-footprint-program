import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { APP_VERSION } from "@/config/environment";
import { sidebarTransition } from "@/theme";

interface SidebarVersionProps {
  isExpanded: boolean;
}

export const SidebarVersion: FC<SidebarVersionProps> = ({ isExpanded }) => {
  return (
    <Box
      sx={(theme) => ({
        display: "flex",
        justifyContent: "center",
        opacity: isExpanded ? 1 : 0,
        transition: sidebarTransition(theme, "opacity"),
      })}
    >
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ px: 1, textAlign: "center" }}
      >
        {APP_VERSION}
      </Typography>
    </Box>
  );
};
