import { FC, PropsWithChildren } from "react";
import { Box } from "@mui/material";
import { MaintainerSidebar } from "./MaintainerSidebar";

export const MaintainerLayout: FC<PropsWithChildren> = ({ children }) => (
  <Box sx={{ display: "flex", minHeight: "100vh" }}>
    <MaintainerSidebar width={268} />
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        pt: 4,
        px: 4,
        pb: 3,
        backgroundColor: "#f9fafb",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      {children}
    </Box>
  </Box>
);
