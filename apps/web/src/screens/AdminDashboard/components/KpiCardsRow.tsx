import { FC } from "react";
import { Stack } from "@mui/material";
import {
  BusinessOutlined,
  PublicOutlined,
  EmojiEventsOutlined,
} from "@mui/icons-material";
import { AdminDashboardKpisResponse } from "@repo/types";
import { KpiCard } from "./KpiCard";

interface Props {
  data: AdminDashboardKpisResponse;
}

export const KpiCardsRow: FC<Props> = ({ data }) => {
  return (
    <Stack direction="row" spacing={3}>
      <KpiCard
        label="Empresas inscritas"
        icon={<BusinessOutlined sx={{ color: "#0288D1" }} />}
        primaryValue={data.organizations.total}
        secondaryValue={data.organizations.measuringInYear}
        subtitle="Total | midiendo en el año"
        backgroundColor="rgba(2, 136, 209, 0.2)"
      />
      <KpiCard
        label="Huella tCO₂e"
        icon={<PublicOutlined sx={{ color: "#00897B" }} />}
        primaryValue={data.emissions.total}
        secondaryValue={data.emissions.verified}
        subtitle="Total | Verificada"
        backgroundColor="rgba(99, 228, 207, 0.2)"
      />
      <KpiCard
        label="Reconocimientos"
        icon={<EmojiEventsOutlined sx={{ color: "#ED6C02" }} />}
        primaryValue={data.recognitions.awarded}
        secondaryValue={data.recognitions.inApplication}
        subtitle="Entregados | en postulación"
        backgroundColor="rgba(237, 108, 2, 0.2)"
      />
    </Stack>
  );
};
