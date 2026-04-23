import { FC, useEffect, useMemo } from "react";
import {
  alpha,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { SubmissionType, SubmissionStatus } from "@repo/types";
import { useAdminRequestsKpis } from "@/api/query/requests/useAdminRequestsKpis";
import { useBadgePreviews } from "@/api/query";
import { RECOGNITION_BADGE_TYPES } from "@/utils/recognitions";
import {
  RECOGNITION_TYPES,
  RECOGNITION_TYPES_SET,
  RECOGNITION_TYPE_LABELS,
} from "../constants";
import { RecognitionTypeCard } from "./RecognitionTypeCard";
import {
  SUBMISSION_LETTER,
  SUBMISSION_TYPE_TO_BADGE_TYPE,
} from "../../Recognitions/constants";

interface RecognitionsSummaryCardProps {
  year?: number;
}

export const RecognitionsSummaryCard: FC<RecognitionsSummaryCardProps> = ({
  year,
}) => {
  const theme = useTheme();
  const { data, isLoading, isError } = useAdminRequestsKpis(year);
  const { data: badgePreviews = [] } = useBadgePreviews(
    RECOGNITION_BADGE_TYPES
  );
  const badgePreviewByType = useMemo(
    () => new Map(badgePreviews.map((p) => [p.badgeType, p.previewUrl])),
    [badgePreviews]
  );
  const { enqueueSnackbar } = useSnackbar();

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

  return (
    <Card
      sx={{
        borderRadius: "12px",
        boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
      }}
    >
      <CardContent>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Reconocimientos Otorgados
        </Typography>

        {isLoading ? (
          <Stack direction="row" spacing={2}>
            {Array.from({ length: 5 }).map((_, i) => (
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
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <RecognitionTypeCard
              label="Total"
              approved={recognitionData.total}
              approvedAuto={0}
              backgroundColor={alpha(theme.palette.primary.main, 0.2)}
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
                  backgroundColor={alpha(
                    theme.palette.recognitionTypeColors[type],
                    0.6
                  )}
                  showPaired={
                    type === SubmissionType.CARBON_INVENTORY_CALCULATION &&
                    typeData.approved > 0 &&
                    typeData.approvedAuto > 0
                  }
                  previewUrl={badgePreviewByType.get(
                    SUBMISSION_TYPE_TO_BADGE_TYPE[type]
                  )}
                  fallbackLetter={SUBMISSION_LETTER[type]}
                />
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};
