import { FC, useEffect } from "react";
import { Stack, useTheme } from "@mui/material";
import {
  BusinessOutlined,
  Co2Outlined,
  EmojiEventsOutlined,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useAdminDashboardKpis } from "@/api/query/dashboard";
import { KpiSummaryCard } from "./KpiSummaryCard";
import { VOCAB } from "@/config/vocab";
import { capitalize } from "lodash-es";

interface KpiSummarySectionProps {
  year?: number;
}

export const KpiSummarySection: FC<KpiSummarySectionProps> = ({ year }) => {
  const { data, isLoading, isError } = useAdminDashboardKpis(year);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  useEffect(() => {
    if (isError) {
      enqueueSnackbar("Error al cargar los KPIs del dashboard", {
        variant: "error",
      });
    }
  }, [isError, enqueueSnackbar]);

  return (
    <Stack direction="row" spacing={2}>
      <KpiSummaryCard
        title={`${capitalize(VOCAB.organization.noun.plural)} ${VOCAB.inscription.adjective.plural}`}
        color={theme.palette.info.main}
        Icon={BusinessOutlined}
        primaryValue={data?.totalOrganizations ?? 0}
        primaryLabel="Total"
        secondaryValue={data?.measuringOrganizations ?? 0}
        secondaryLabel="Midiendo"
        isLoading={isLoading}
        hasError={isError}
      />
      <KpiSummaryCard
        title="Emisiones (tCO₂e)"
        color={theme.palette.secondary.main}
        Icon={Co2Outlined}
        primaryValue={data?.totalEmissions ?? 0}
        primaryLabel="Total"
        secondaryValue={data?.verifiedEmissions ?? 0}
        secondaryLabel="Verificadas"
        isLoading={isLoading}
        hasError={isError}
      />
      <KpiSummaryCard
        title="Reconocimientos"
        color={theme.palette.warning.main}
        Icon={EmojiEventsOutlined}
        primaryValue={data?.recognitionsEarned ?? 0}
        primaryLabel="Entregados"
        secondaryValue={data?.recognitionsUnderReview ?? 0}
        secondaryLabel="En revisión"
        isLoading={isLoading}
        hasError={isError}
      />
    </Stack>
  );
};
