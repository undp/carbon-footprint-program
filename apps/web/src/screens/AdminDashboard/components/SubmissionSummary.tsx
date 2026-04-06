import { FC } from "react";
import { Box, Card, Stack, Typography } from "@mui/material";
import { AdminDashboardKpisResponse } from "@repo/types";

interface Props {
  data: AdminDashboardKpisResponse["submissionSummary"];
}

interface SummaryCardProps {
  label: string;
  value: number;
  color: string;
  bgColor: string;
}

const SummaryCard: FC<SummaryCardProps> = ({ label, value, color, bgColor }) => (
  <Card
    sx={{
      flex: 1,
      p: 2.5,
      borderRadius: "12px",
      boxShadow: "0px 2px 8px rgba(0,0,0,0.08)",
      borderLeft: `4px solid ${color}`,
    }}
  >
    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
      {label}
    </Typography>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "8px",
          backgroundColor: bgColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ color }}>
          {value}
        </Typography>
      </Box>
    </Box>
  </Card>
);

export const SubmissionSummary: FC<Props> = ({ data }) => {
  return (
    <Box>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Resumen de Postulaciones
      </Typography>
      <Stack direction="row" spacing={3}>
        <SummaryCard
          label="En Revisión"
          value={data.inReview}
          color="#ED6C02"
          bgColor="rgba(237, 108, 2, 0.12)"
        />
        <SummaryCard
          label="Aprobadas"
          value={data.approved}
          color="#2E7D32"
          bgColor="rgba(46, 125, 50, 0.12)"
        />
        <SummaryCard
          label="Con Observaciones"
          value={data.objected}
          color="#7B1FA2"
          bgColor="rgba(123, 31, 162, 0.12)"
        />
      </Stack>
    </Box>
  );
};
