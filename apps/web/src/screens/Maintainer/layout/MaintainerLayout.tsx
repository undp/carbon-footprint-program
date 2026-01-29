import { Box } from "@mui/material";
import { FC, PropsWithChildren } from "react";
import { MaintainerSidebar } from "./MaintainerSidebar";

export const MaintainerLayout: FC<PropsWithChildren> = ({ children }) => (
  <Box className="min-h-screen pl-[268px]">
    <MaintainerSidebar width={268} />
    <Box className="flex min-h-screen flex-col gap-3 bg-gray-50 px-6 py-6">
      {children}
    </Box>
  </Box>
);
