import { FC } from "react";
import { alpha, Box, Button, Card, Stack, Typography } from "@mui/material";
import { FilterListOutlined, FileDownloadOutlined } from "@mui/icons-material";
import { StylizedDataGrid } from "@components";
import { useRequestColumns, type RequestRow } from "../hooks/useRequestColumns";
import { useAdminRequestsKpis } from "../../../api/query/requests/useAdminRequestsKpis";
import { useAdminRequests } from "../../../api/query/requests/useAdminRequests";

export const AdminRequestsScreen: FC = () => {
  const {
    data: kpis,
    isLoading: isLoadingKpis,
    // refetch: refetchKpis,
  } = useAdminRequestsKpis();

  const {
    data: requests = [],
    isLoading: isLoadingRequests,
    // refetch: refetchRequests,
  } = useAdminRequests();

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
        {kpis?.map((kpi) => (
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
              ></Box>
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
          rows={requests}
          rowHeight={52}
          getRowId={(row: RequestRow) => row.id}
        />
      </Box>
    </Box>
  );
};
