import { FC } from "react";
import { alpha, Box, Card, Skeleton, Stack, Typography } from "@mui/material";
import { useAdminRequestsKpis } from "@/api/query/requests/useAdminRequestsKpis";
import {
  TaskOutlined,
  AccessTimeOutlined,
  CheckCircleOutlined,
  CancelOutlined,
} from "@mui/icons-material";
import { RequestStatus } from "@/api/query/requests/useAdminRequests";

const getColorByRequestStatus = (status: RequestStatus | null): string => {
  if (!status) return "#459F90";

  if (status === RequestStatus.PENDING) return "#E65100";
  if (status === RequestStatus.APPROVED) return "#004D35";
  if (status === RequestStatus.REJECTED) return "#C62828";

  return "#000000";
};

const getIconByRequestStatus = (
  status: RequestStatus | null
): typeof TaskOutlined | null => {
  if (!status) return TaskOutlined;

  if (status === RequestStatus.PENDING) return AccessTimeOutlined;
  if (status === RequestStatus.APPROVED) return CheckCircleOutlined;
  if (status === RequestStatus.REJECTED) return CancelOutlined;

  return null;
};

const getLabelByRequestStatus = (status: RequestStatus | null): string => {
  if (!status) return "Total";

  if (status === RequestStatus.PENDING) return "Pendientes";
  if (status === RequestStatus.APPROVED) return "Aprobadas";
  if (status === RequestStatus.REJECTED) return "Rechazadas";

  return "";
};

const KpiCardSkeleton: FC = () => (
  <Card
    sx={{
      minHeight: "130px",
      flex: 1,
      p: 2,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      borderRadius: "12px",
      boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
    }}
  >
    <Box className="flex w-full justify-between">
      <Skeleton variant="text" width={80} height={20} />
      <Skeleton variant="rounded" width={40} height={40} />
    </Box>
    <Skeleton variant="text" width={60} height={40} sx={{ mt: 1 }} />
  </Card>
);

export const RequestScreenKpiSection: FC = () => {
  const { data: kpis, isLoading } = useAdminRequestsKpis();

  if (isLoading) {
    return (
      <Stack direction="row" spacing={2}>
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={2}>
      {kpis?.map((kpi) => {
        const Icon = getIconByRequestStatus(kpi.status);
        const color = getColorByRequestStatus(kpi.status);
        const label = getLabelByRequestStatus(kpi.status);
        return (
          <Card
            key={label}
            sx={{
              minHeight: "130px",
              flex: 1,
              p: 2,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderRadius: "12px",
              backgroundColor: alpha(color, 0.1),
              boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <Box className="flex w-full justify-between">
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
              <Box
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                sx={{
                  backgroundColor: alpha(color, 0.1),
                  color: color,
                }}
              >
                {Icon && <Icon />}
              </Box>
            </Box>
            <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
              {kpi.value}
            </Typography>
          </Card>
        );
      })}
    </Stack>
  );
};
