import { FC } from "react";
import { Box, Button, Card, Stack, Typography } from "@mui/material";
import { FilterListOutlined, FileDownloadOutlined } from "@mui/icons-material";
import { OrganizationScreenKpiSection } from "../components/OrganizationScreenKpiSection";
import { OrganizationScreenTable } from "../components/OrganizationScreenTable";

export const AdminOrganizationsScreen: FC = () => {
  return (
    <Box className="flex flex-col gap-6">
      {/* Header */}
      <Card
        sx={{
          p: 2,
          borderRadius: "16px",
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Empresas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gestión de empresas registradas en el sistema
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<FilterListOutlined />}
              size="small"
            >
              Filtros
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadOutlined />}
              size="small"
            >
              Exportar
            </Button>
          </Stack>
        </Stack>
      </Card>

      {/* KPI Cards */}
      <OrganizationScreenKpiSection />

      {/* Table */}
      <OrganizationScreenTable />
    </Box>
  );
};
