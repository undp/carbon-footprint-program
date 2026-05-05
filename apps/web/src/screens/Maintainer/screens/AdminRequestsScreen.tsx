import { FC } from "react";
import { Box, Button, Card, Stack, Typography } from "@mui/material";
import { FileDownloadOutlined } from "@mui/icons-material";
import { InfoButton } from "@/components";
import { useExplanationDialog } from "@/contexts";
import { RequestScreenKpiSection } from "../components/RequestScreenKpiSection";
import { RequestScreenTable } from "../components/RequestScreenTable";

const ADMIN_REQUESTS_EXPLANATION_SLUGS = {
  MAIN: "admin-requests",
} as const;

export const AdminRequestsScreen: FC = () => {
  const { openExplanationBySlug } = useExplanationDialog();

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
            <Box className="flex items-center gap-1">
              <Typography variant="h5" fontWeight={700}>
                Solicitudes
              </Typography>
              <InfoButton
                label="Más información"
                onClick={() =>
                  openExplanationBySlug(ADMIN_REQUESTS_EXPLANATION_SLUGS.MAIN)
                }
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Gestión de solicitudes de reconocimientos, inscripciones y accesos
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
      <RequestScreenKpiSection />

      {/* Table */}
      <RequestScreenTable />
    </Box>
  );
};
