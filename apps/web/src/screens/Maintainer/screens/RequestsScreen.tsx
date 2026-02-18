import { FC } from "react";
import { alpha, Box, Button, Card, Stack, Typography } from "@mui/material";
import { FilterListOutlined, FileDownloadOutlined } from "@mui/icons-material";
import { StylizedDataGrid } from "@components";
import { useRequestColumns, type RequestRow } from "../hooks/useRequestColumns";
import {
  TaskOutlined,
  AccessTimeOutlined,
  CheckCircleOutlined,
  CancelOutlined,
} from "@mui/icons-material";
import { RequestStatus } from "../components/RequestStatusChip";

const MOCK_REQUESTS: RequestRow[] = [
  {
    id: "1",
    empresa: "Empresa Demo S.A.",
    tipo: "Diploma Medición",
    periodo: "2024",
    estado: RequestStatus.PENDING,
    fechaEnvio: "5 dic 2024",
  },
  {
    id: "2",
    empresa: "Tech Solutions Ltd.",
    tipo: "Diploma Medición",
    periodo: "2024",
    estado: RequestStatus.REJECTED,
    fechaEnvio: "10 dic 2024",
  },
  {
    id: "3",
    empresa: "Retail Global Corp.",
    tipo: "Sello Neutralización",
    periodo: "2024",
    estado: RequestStatus.REJECTED,
    fechaEnvio: "28 nov 2024",
  },
  {
    id: "4",
    empresa: "Empresa Demo S.A.",
    tipo: "Sello Reducción",
    periodo: "2023",
    estado: RequestStatus.APPROVED,
    fechaEnvio: "10 dic 2023",
  },
  {
    id: "5",
    empresa: "Logística Express",
    tipo: "Sello Reducción",
    periodo: "2024",
    estado: RequestStatus.REJECTED,
    fechaEnvio: "15 oct 2024",
  },
  {
    id: "6",
    empresa: "Alimentos del Sur",
    tipo: "Diploma Medición",
    periodo: "2024",
    estado: RequestStatus.PENDING,
    fechaEnvio: "12 dic 2024",
  },
  {
    id: "7",
    empresa: "Retail Global Corp.",
    tipo: "Sello Verificación",
    periodo: "2024",
    estado: RequestStatus.DRAFT,
    fechaEnvio: "-",
  },
  {
    id: "8",
    empresa: "Tech Solutions Ltd.",
    tipo: "Acreditación",
    periodo: "2024",
    estado: RequestStatus.PENDING,
    fechaEnvio: "15 dic 2024",
  },
  {
    id: "9",
    empresa: "Logística Express",
    tipo: "Acreditación",
    periodo: "2024",
    estado: RequestStatus.PENDING,
    fechaEnvio: "14 dic 2024",
  },
  {
    id: "10",
    empresa: "Empresa Demo S.A.",
    tipo: "Solicitud de Acceso",
    periodo: "-",
    estado: RequestStatus.PENDING,
    fechaEnvio: "16 dic 2024",
  },
  {
    id: "11",
    empresa: "Alimentos del Sur",
    tipo: "Diploma Medición",
    periodo: "2024",
    estado: RequestStatus.APPROVED,
    fechaEnvio: "18 dic 2024",
  },
];

const KPI_CARDS = [
  {
    status: null,
    label: "Total",
    icon: <TaskOutlined />,
    value: 11,
    color: "#459F90",
  },
  {
    status: RequestStatus.PENDING,
    label: "Pendientes",
    icon: <AccessTimeOutlined />,
    value: 3,
    color: "#E65100",
  },
  {
    status: RequestStatus.APPROVED,
    label: "Aprobadas",
    icon: <CheckCircleOutlined />,
    value: 1,
    color: "#004D35",
  },
  {
    status: RequestStatus.REJECTED,
    label: "Rechazadas",
    icon: <CancelOutlined />,
    value: 1,
    color: "#C62828",
  },
];

export const RequestsScreen: FC = () => {
  const columns = useRequestColumns();

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
              Solicitudes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gestión de solicitudes de reconocimientos, acreditaciones y
              accesos
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
      <Stack direction="row" spacing={2}>
        {KPI_CARDS.map((kpi) => (
          <Card
            key={kpi.label}
            sx={{
              minHeight: "130px",
              flex: 1,
              p: 2,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderRadius: "12px",
              backgroundColor: alpha(kpi.color, 0.1),
              boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <Box className="flex w-full justify-between">
              <Typography variant="body2" color="text.secondary">
                {kpi.label}
              </Typography>
              <Box
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                sx={{
                  backgroundColor: alpha(kpi.color, 0.1),
                  color: kpi.color,
                }}
              >
                {kpi.icon}
              </Box>
            </Box>
            <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
              {kpi.value}
            </Typography>
          </Card>
        ))}
      </Stack>

      {/* Table */}
      <Box>
        <StylizedDataGrid
          sx={(theme) => ({
            backgroundColor: "white",
            border: "none",
            boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
            "& .MuiDataGrid-main": {
              padding: "16px !important",
            },
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: theme.palette.background.default,
            },
            "& .MuiDataGrid-cell": {
              minHeight: "65px",
              padding: "10px",
            },
          })}
          columns={columns}
          rows={MOCK_REQUESTS}
          rowHeight={52}
          getRowId={(row: RequestRow) => row.id}
        />
      </Box>
    </Box>
  );
};
