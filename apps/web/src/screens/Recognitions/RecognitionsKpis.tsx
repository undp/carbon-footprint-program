import { FC, useMemo } from "react";
import { Box } from "@mui/material";
import { GetOrganizationRecognitionsResponse } from "@repo/types";
import { useBadgePreviews } from "@/api/query";
import {
  RECOGNITION_BADGE_TYPES,
  RECOGNITION_SUBMISSION_TYPES,
} from "@/utils/recognitions";
import { RecognitionCard } from "./RecognitionCard";

interface RecognitionsKpisProps {
  recognitions: GetOrganizationRecognitionsResponse;
}

export const RecognitionsKpis: FC<RecognitionsKpisProps> = ({
  recognitions,
}) => {
  const { data: badgePreviews = [] } = useBadgePreviews(
    RECOGNITION_BADGE_TYPES
  );

  const submissionTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of recognitions) {
      counts[r.submissionType] = (counts[r.submissionType] ?? 0) + 1;
    }
    return counts;
  }, [recognitions]);

  // TODO: Restore grid-cols-4 once the admin neutralization module is implemented
  // and NEUTRALIZATION_PLAN_VERIFICATION is added back to RECOGNITION_SUBMISSION_TYPES.
  return (
    <Box className="grid grid-cols-3 gap-6 rounded-lg bg-white p-6">
      {RECOGNITION_SUBMISSION_TYPES.map((submissionType) => (
        <RecognitionCard
          key={submissionType}
          submissionType={submissionType}
          badgePreviews={badgePreviews}
          count={submissionTypeCounts[submissionType] ?? 0}
        />
      ))}
    </Box>
  );
};
