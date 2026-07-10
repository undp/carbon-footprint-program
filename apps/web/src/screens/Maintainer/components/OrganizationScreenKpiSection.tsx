import { FC, useMemo } from "react";
import { Stack, useTheme } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import {
  DescriptionOutlined,
  InsightsOutlined,
  AccessTimeOutlined,
  GppBadOutlined,
} from "@mui/icons-material";
import { useAdminOrganizationsKpis } from "@/api/query/organizations/useAdminOrganizationsKpis";
import { RequestScreenKpiCard } from "./RequestScreenKpiCard";
import { RequestScreenKpiCardSkeleton } from "./RequestScreenKpiCardSkeleton";
import { VOCAB } from "@/config/vocab";
import { capitalize } from "lodash-es";

type OrganizationKpiKey =
  "total" | "withMeasurements" | "registered" | "notAccredited";

const KPI_ORDER: OrganizationKpiKey[] = [
  "total",
  "withMeasurements",
  "registered",
  "notAccredited",
];

const LABELS: Record<OrganizationKpiKey, string> = {
  total: `Total ${capitalize(VOCAB.organization.noun.plural)}`,
  withMeasurements: "con Mediciones",
  registered: "Registradas",
  notAccredited: `No ${capitalize(VOCAB.inscription.adjective.plural)}`,
};

const ICONS: Record<OrganizationKpiKey, SvgIconComponent> = {
  total: DescriptionOutlined,
  withMeasurements: InsightsOutlined,
  registered: AccessTimeOutlined,
  notAccredited: GppBadOutlined,
};

export const OrganizationScreenKpiSection: FC = () => {
  const { data: kpisData, isLoading } = useAdminOrganizationsKpis();
  const theme = useTheme();

  const COLORS: Record<OrganizationKpiKey, string> = {
    total: theme.palette.success.dark,
    withMeasurements: theme.palette.secondary.dark,
    registered: theme.palette.warning.dark,
    notAccredited: theme.palette.error.dark,
  };

  const values = useMemo(() => {
    const counts = kpisData?.counts ?? [];
    const map: Record<OrganizationKpiKey, number> = {
      total: kpisData?.total ?? 0,
      withMeasurements: 0,
      registered: 0,
      notAccredited: 0,
    };

    for (const item of counts) {
      if (item.accredited && item.withInventories) {
        map.withMeasurements += item.count;
      }
      if (item.accredited && !item.withInventories) {
        map.registered += item.count;
      }
      if (!item.accredited) {
        map.notAccredited += item.count;
      }
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
      {KPI_ORDER.map((key) => (
        <RequestScreenKpiCard
          key={key}
          label={LABELS[key]}
          color={COLORS[key]}
          Icon={ICONS[key]}
          value={values[key]}
        />
      ))}
    </Stack>
  );
};
