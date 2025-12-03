import { Box, Container } from "@mui/material";
import { Sidebar } from "./Sidebar/Sidebar";

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <Box className="flex">
      <Sidebar />
      <Container className="py-6">{children}</Container>
    </Box>
  );
};
