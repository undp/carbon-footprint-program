import { FC, useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from "@mui/material";
import {
  AccessTimeOutlined,
  CheckCircleOutlined,
  DisabledVisibleOutlined,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { SubmissionType, SubmissionStatus } from "@repo/types";
import { useAdminRequestsKpis } from "@/api/query/requests/useAdminRequestsKpis";
import { RECOGNITION_TYPES } from "../constants";
import { SubmissionStatusCard } from "./SubmissionStatusCard";
import { VOCAB } from "../../../config/vocab";
import { capitalize } from "lodash-es";

type SubmissionsTab = "inscription" | "recognitions";

interface SubmissionsSummaryCardProps {
  year?: number;
}

export const SubmissionsSummaryCard: FC<SubmissionsSummaryCardProps> = ({
  year,
}) => {
  const [activeTab, setActiveTab] = useState<SubmissionsTab>("recognitions");
  const { data, isLoading, isError } = useAdminRequestsKpis(year);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  useEffect(() => {
    if (isError) {
      enqueueSnackbar("Error al cargar el resumen de postulaciones", {
        variant: "error",
      });
    }
  }, [isError, enqueueSnackbar]);

  const { pendingCount, approvedCount, approvedAutoCount, reviewedCount } =
    useMemo(() => {
      if (!data) {
        return {
          pendingCount: 0,
          approvedCount: 0,
          approvedAutoCount: 0,
          reviewedCount: 0,
        };
      }

      const typesToCount =
        activeTab === "inscription"
          ? [SubmissionType.ORGANIZATION_ACCREDITATION]
          : RECOGNITION_TYPES;

      let pending = 0;
      let approved = 0;
      let approvedAuto = 0;
      let reviewed = 0;

      for (const entry of data.counts) {
        if (!typesToCount.some((t) => t === entry.type)) continue;
        if (entry.status === SubmissionStatus.PENDING) pending += entry.value;
        if (entry.status === SubmissionStatus.APPROVED) approved += entry.value;
        if (entry.status === SubmissionStatus.APPROVED_AUTOMATICALLY)
          approvedAuto += entry.value;
        if (entry.status === SubmissionStatus.REVIEWED) reviewed += entry.value;
      }

      return {
        pendingCount: pending,
        approvedCount: approved,
        approvedAutoCount: approvedAuto,
        reviewedCount: reviewed,
      };
    }, [data, activeTab]);

  return (
    <Card
      sx={{
        borderRadius: "12px",
        boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
      }}
    >
      <CardContent>
        <Box className="mb-4 flex items-center justify-between">
          <Typography variant="h6" fontWeight={700}>
            Resumen de postulaciones{" "}
            {activeTab === "inscription"
              ? `de ${capitalize(VOCAB.organization.noun.plural)}`
              : `de Huellas`}
          </Typography>
          <Tabs
            value={activeTab}
            onChange={(_, val: SubmissionsTab) => setActiveTab(val)}
            sx={{ minHeight: "unset" }}
          >
            <Tab
              label="Inscripción"
              value="inscription"
              sx={{ minHeight: "unset", py: 0.5, px: 1, fontSize: "0.75rem" }}
            />
            <Tab
              label="Reconocimientos"
              value="recognitions"
              sx={{ minHeight: "unset", py: 0.5, px: 1, fontSize: "0.75rem" }}
            />
          </Tabs>
        </Box>

        {isLoading ? (
          <Stack direction="row" spacing={2}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                sx={{ flex: 1, borderRadius: "12px", height: 100 }}
              />
            ))}
          </Stack>
        ) : isError ? (
          <Typography variant="body2" color="error.main">
            Error al cargar los datos
          </Typography>
        ) : (
          <Stack direction="row" spacing={2}>
            <SubmissionStatusCard
              label="En revisión"
              color={theme.palette.warning.dark}
              Icon={AccessTimeOutlined}
              primary={pendingCount}
            />
            <SubmissionStatusCard
              label="Aprobadas"
              color={theme.palette.success.dark}
              Icon={CheckCircleOutlined}
              primary={approvedCount}
              primaryLabel="Manual"
              secondary={approvedAutoCount}
              secondaryLabel="Automático"
            />
            <SubmissionStatusCard
              label="Con observaciones"
              color={"#9B59B6"}
              Icon={DisabledVisibleOutlined}
              primary={reviewedCount}
            />
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};
