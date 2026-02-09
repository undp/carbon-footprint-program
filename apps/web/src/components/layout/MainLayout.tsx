import { FC, PropsWithChildren } from "react";
import { Box } from "@mui/material";
import { Sidebar } from "./Sidebar/Sidebar";
import { SIDEBAR_WIDTH } from "@/config/constants";

export const MainLayout: FC<PropsWithChildren> = ({ children }) => (
  <Box className="flex h-screen flex-1">
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
      }}
    >
      <Sidebar />
    </Box>
    <Box className="flex min-h-0 flex-1 overflow-y-auto px-6 py-6">
      {children}
    </Box>
  </Box>
);
