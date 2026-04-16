import { FC, useEffect, useMemo } from "react";
import { Card, Skeleton, Stack, Typography, useTheme } from "@mui/material";
import { useSnackbar } from "notistack";
import { SubmissionType, SubmissionStatus } from "@repo/types";
import { useAdminRequestsKpis } from "@/api/query/requests/useAdminRequestsKpis";
import {
  RECOGNITION_TYPES,
  RECOGNITION_TYPES_SET,
  RECOGNITION_TYPE_LABELS,
} from "../constants";
import { RecognitionTypeCard } from "./RecognitionTypeCard";

interface RecognitionTypeCardsProps {
  year?: number;
}

export const RecognitionTypeCards: FC<RecognitionTypeCardsProps> = ({
  year,
}) => {
  const { data, isLoading, isError } = useAdminRequestsKpis(year);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  useEffect(() => {
    if (isError) {
      enqueueSnackbar("Error al cargar los reconocimientos otorgados", {
        variant: "error",
      });
    }
  }, [isError, enqueueSnackbar]);

  const recognitionData = useMemo(() => {
    if (!data) {
      return {
        total: 0,
        byType: {} as Record<
          string,
          { approved: number; approvedAuto: number }
        >,
      };
    }

    const byType: Record<string, { approved: number; approvedAuto: number }> =
      {};

    for (const type of RECOGNITION_TYPES) {
      byType[type] = { approved: 0, approvedAuto: 0 };
    }

    for (const entry of data.counts) {
      if (!RECOGNITION_TYPES_SET.has(entry.type)) continue;
      if (entry.status === SubmissionStatus.APPROVED) {
        byType[entry.type].approved += entry.value;
      }
      if (entry.status === SubmissionStatus.APPROVED_AUTOMATICALLY) {
        byType[entry.type].approvedAuto += entry.value;
      }
    }

    const total = Object.values(byType).reduce(
      (sum, t) => sum + t.approved + t.approvedAuto,
      0
    );

    return { total, byType };
  }, [data]);

  const color = theme.palette.success.dark;

  if (isLoading) {
    return (
      <Stack direction="row" spacing={2}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            sx={{ flex: 1, borderRadius: "12px", height: 100 }}
          />
        ))}
      </Stack>
    );
  }

  if (isError) {
    return (
      <Card
        sx={{
          p: 2,
          borderRadius: "12px",
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
        }}
      >
        <Typography variant="body2" color="error.main">
          Error al cargar los datos
        </Typography>
      </Card>
    );
  }

  return (
    <Stack direction="row" spacing={2} flexWrap="wrap">
      <RecognitionTypeCard
        label="Total Reconocimientos"
        approved={recognitionData.total}
        approvedAuto={0}
        color={color}
      />
      {RECOGNITION_TYPES.map((type) => {
        const typeData = recognitionData.byType[type] ?? {
          approved: 0,
          approvedAuto: 0,
        };
        return (
          <RecognitionTypeCard
            key={type}
            label={RECOGNITION_TYPE_LABELS[type]}
            approved={typeData.approved}
            approvedAuto={typeData.approvedAuto}
            color={color}
            showPaired={type === SubmissionType.CARBON_INVENTORY_CALCULATION}
          />
        );
      })}
    </Stack>
  );
};
