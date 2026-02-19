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
import groupBy from "lodash-es/groupBy";
import sumBy from "lodash-es/sumBy";
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

export const RequestScreenKpiSection: FC = () => {
  const { data: kpisData, isLoading } = useAdminRequestsKpis();

  const groupedData = useMemo<
    { status: RequestStatus; value: number }[]
  >(() => {
    const byStatus = groupBy(kpisData?.counts ?? [], (kpi) => kpi.status);

    return Object.values(byStatus).map((group) => ({
      status: group[0].status,
      value: sumBy(group, "value"),
    }));
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
      {groupedData.map((kpi) => {
        const label = LABEL_BY_STATUS[kpi.status];
        return (
          <RequestScreenKpiCard
            key={label}
            label={label}
            color={COLOR_BY_STATUS[kpi.status]}
            Icon={ICON_BY_STATUS[kpi.status]}
            value={kpi.value}
          />
        );
      })}
    </Stack>
  );
};
