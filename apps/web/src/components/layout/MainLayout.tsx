import { FC, PropsWithChildren } from "react";
import { Box, Container } from "@mui/material";
import { Sidebar } from "./Sidebar/Sidebar";
import { SIDEBAR_WIDTH } from "@/config/constants";

export const MainLayout: FC<PropsWithChildren> = ({ children }) => (
  <Box className={`pl-[${SIDEBAR_WIDTH}px]`}>
    <Sidebar />
    <Container className="px-6 py-6">{children}</Container>
  </Box>
);
