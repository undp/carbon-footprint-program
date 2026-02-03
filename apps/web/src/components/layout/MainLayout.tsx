import { FC, PropsWithChildren } from "react";
import { Box, Container } from "@mui/material";
import { Sidebar } from "./Sidebar/Sidebar";

export const MainLayout: FC<PropsWithChildren> = ({ children }) => (
  <Box className="pl-[268px]">
    <Sidebar />
    <Container className="px-6 py-6">{children}</Container>
  </Box>
);
