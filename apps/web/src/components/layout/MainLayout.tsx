import { FC, PropsWithChildren } from "react";
import { Box, Container } from "@mui/material";
import { Sidebar } from "./Sidebar/Sidebar";

export const MainLayout: FC<PropsWithChildren> = ({ children }) => (
  <Box className="flex">
    <Sidebar />
    <Container className="py-6">{children}</Container>
  </Box>
);
