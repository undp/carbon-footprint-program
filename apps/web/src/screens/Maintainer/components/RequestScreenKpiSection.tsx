import { FC, useMemo } from "react";
import { Stack } from "@mui/material";
import { useAdminRequestsKpis } from "@/api/query/requests/useAdminRequestsKpis";
import {
  TaskOutlined,
  AccessTimeOutlined,
  CheckCircleOutlined,
  CancelOutlined,
} from "@mui/icons-material";
import { SubmissionStatus as RequestStatus } from "@repo/types";
import { RequestScreenKpiCard } from "./RequestScreenKpiCard";
import { RequestScreenKpiCardSkeleton } from "./RequestScreenKpiCardSkeleton";

const TOTAL_CARD_ASSETS = {
  label: "Total",
  color: "#459F90",
  Icon: TaskOutlined,
};

const COLOR_BY_STATUS: Record<RequestStatus, string> = {
  [RequestStatus.PENDING]: "#E65100",
  [RequestStatus.APPROVED]: "#004D35",
  [RequestStatus.REJECTED]: "#C62828",
};

const ICON_BY_STATUS: Record<RequestStatus, typeof TaskOutlined> = {
  [RequestStatus.PENDING]: AccessTimeOutlined,
  [RequestStatus.APPROVED]: CheckCircleOutlined,
  [RequestStatus.REJECTED]: CancelOutlined,
};

const LABEL_BY_STATUS: Record<RequestStatus, string> = {
  [RequestStatus.PENDING]: "Pendientes",
  [RequestStatus.APPROVED]: "Aprobadas",
  [RequestStatus.REJECTED]: "Rechazadas",
};

const STATUS_ORDER: RequestStatus[] = [
  RequestStatus.PENDING,
  RequestStatus.APPROVED,
  RequestStatus.REJECTED,
];

export const RequestScreenKpiSection: FC = () => {
  const { data: kpisData, isLoading } = useAdminRequestsKpis();

  const valueByStatus = useMemo(() => {
    const counts = kpisData?.counts ?? [];
    const map: Record<RequestStatus, number> = {
      [RequestStatus.PENDING]: 0,
      [RequestStatus.APPROVED]: 0,
      [RequestStatus.REJECTED]: 0,
    };
    for (const kpi of counts) {
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
        key={TOTAL_CARD_ASSETS.label}
        label={TOTAL_CARD_ASSETS.label}
        color={TOTAL_CARD_ASSETS.color}
        Icon={TOTAL_CARD_ASSETS.Icon}
        value={kpisData?.total ?? 0}
      />
      {STATUS_ORDER.map((status) => (
        <RequestScreenKpiCard
          key={status}
          label={LABEL_BY_STATUS[status]}
          color={COLOR_BY_STATUS[status]}
          Icon={ICON_BY_STATUS[status]}
          value={valueByStatus[status]}
        />
      ))}
    </Stack>
  );
};
