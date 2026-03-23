import { FC } from "react";
import {
  Box,
  Button,
  capitalize,
  Card,
  Stack,
  Typography,
} from "@mui/material";
import { FileDownloadOutlined } from "@mui/icons-material";
import { OrganizationScreenKpiSection } from "../components/OrganizationScreenKpiSection";
import { OrganizationScreenTable } from "../components/OrganizationScreenTable";
import { VOCAB } from "@/config/vocab";

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
              {capitalize(VOCAB.organization.noun.plural)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gestión de {VOCAB.organization.noun.plural} registradas en el
              sistema
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {/* TODO: implement callback for this button */}
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
