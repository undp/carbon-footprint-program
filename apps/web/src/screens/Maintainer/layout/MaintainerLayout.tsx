import { Box } from "@mui/material";
import { FC, PropsWithChildren } from "react";
import { MaintainerSidebar } from "./MaintainerSidebar";

const SIDEBAR_WIDTH = 268;

export const MaintainerLayout: FC<PropsWithChildren> = ({ children }) => (
  <Box className="min-h-screen" style={{ paddingLeft: SIDEBAR_WIDTH }}>
    <MaintainerSidebar width={SIDEBAR_WIDTH} />
    <Box className="flex min-h-screen flex-col gap-3 bg-gray-50 px-6 py-6">
      {children}
    </Box>
  </Box>
);
