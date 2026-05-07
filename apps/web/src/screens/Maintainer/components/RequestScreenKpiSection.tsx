import { FC, useMemo } from "react";
import { Stack, useTheme } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import { useAdminRequestsKpis } from "@/api/query/requests/useAdminRequestsKpis";
import {
  TaskOutlined,
  AccessTimeOutlined,
  CheckCircleOutlined,
  DisabledVisibleOutlined,
} from "@mui/icons-material";
import { SubmissionStatus as RequestStatus } from "@repo/types";
import { RequestScreenKpiCard } from "./RequestScreenKpiCard";
import { RequestScreenKpiCardSkeleton } from "./RequestScreenKpiCardSkeleton";

type FilteredRequestStatus = Exclude<
  RequestStatus,
  "APPROVED_AUTOMATICALLY" | "REJECTED"
>;

const ICON_BY_STATUS: Record<FilteredRequestStatus, SvgIconComponent> = {
  [RequestStatus.PENDING]: AccessTimeOutlined,
  [RequestStatus.APPROVED]: CheckCircleOutlined,
  [RequestStatus.REVIEWED]: DisabledVisibleOutlined,
};

const LABEL_BY_STATUS: Record<FilteredRequestStatus, string> = {
  [RequestStatus.PENDING]: "Pendientes",
  [RequestStatus.APPROVED]: "Aprobadas",
  [RequestStatus.REVIEWED]: "Con observaciones",
};

const STATUS_ORDER: FilteredRequestStatus[] = [
  RequestStatus.PENDING,
  RequestStatus.APPROVED,
  RequestStatus.REVIEWED,
];

export const RequestScreenKpiSection: FC = () => {
  const { data: kpisData, isLoading } = useAdminRequestsKpis();
  const theme = useTheme();

  const REQUESTS_STATUS_COLORS = useMemo<Record<FilteredRequestStatus, string>>(
    () => ({
      [RequestStatus.PENDING]: theme.palette.warning.dark,
      [RequestStatus.APPROVED]: theme.palette.success.dark,
      [RequestStatus.REVIEWED]: theme.palette.error.dark,
      [RequestStatus.REJECTED]: theme.palette.error.dark,
    }),
    [theme]
  );

  const REQUESTS_TOTAL_COLOR = theme.palette.secondary.dark;

  const valueByStatus = useMemo(() => {
    const counts = kpisData?.counts ?? [];
    const map: Record<FilteredRequestStatus, number> = {
      [RequestStatus.PENDING]: 0,
      [RequestStatus.APPROVED]: 0,
      [RequestStatus.REVIEWED]: 0,
    };
    for (const kpi of counts) {
      if (kpi.status === RequestStatus.APPROVED_AUTOMATICALLY) {
        map[RequestStatus.APPROVED] += kpi.value;
        continue;
      }
      if (kpi.status === RequestStatus.REJECTED) {
        continue;
      }
      map[kpi.status] += kpi.value;
    }
    return map;
  }, [kpisData]);

  if (isLoading) {
    return (
      <Stack direction="row" spacing={2}>
        {Array.from({ length: 4 }).map((_, i) => (
          <RequestScreenKpiCardSkeleton key={i} />
        ))}
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={2}>
      <RequestScreenKpiCard
        label="Total"
        color={REQUESTS_TOTAL_COLOR}
        Icon={TaskOutlined}
        value={kpisData?.total ?? 0}
      />
      {STATUS_ORDER.map((status) => (
        <RequestScreenKpiCard
          key={status}
          label={LABEL_BY_STATUS[status]}
          color={REQUESTS_STATUS_COLORS[status]}
          Icon={ICON_BY_STATUS[status]}
          value={valueByStatus[status]}
        />
      ))}
    </Stack>
  );
};
