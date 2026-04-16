import { FC } from "react";
import { Avatar, Box, Tooltip } from "@mui/material";
import {
  SubmissionType,
  type CarbonInventoryRecognitionsType,
  type GetBadgePreviewsResponse,
} from "@repo/types";
import { SUBMISSION_TYPE_TO_BADGE_TYPE } from "@/screens/Recognitions/constants";
import { RECOGNITION_TYPE_CHIP_LABEL } from "@/utils/recognitions";
import { VOCAB } from "@/config/vocab";

export type TransparencyRecognitions = Record<
  CarbonInventoryRecognitionsType,
  boolean
>;

interface RecognitionSealsProps {
  recognitions: TransparencyRecognitions;
  badgePreviews: GetBadgePreviewsResponse;
  size?: number;
}

const orgArticle = VOCAB.organization.article.singular;

const SEAL_CONFIG: {
  type: CarbonInventoryRecognitionsType;
  tooltip: string;
  letter: string;
}[] = [
  {
    type: SubmissionType.CARBON_INVENTORY_CALCULATION,
    tooltip: `Reconocimiento Medición — ${orgArticle} ha medido su huella de carbono organizacional`,
    letter: "M",
  },
  {
    type: SubmissionType.CARBON_INVENTORY_VERIFICATION,
    tooltip: `Reconocimiento Verificación — ${orgArticle} ha verificado su huella de carbono`,
    letter: "V",
  },
  {
    type: SubmissionType.REDUCTION_PROJECT_VERIFICATION,
    tooltip: `Reconocimiento Reducción — ${orgArticle} ha reducido su huella de carbono`,
    letter: "R",
  },
  {
    type: SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION,
    tooltip: `Reconocimiento Neutralización — ${orgArticle} ha neutralizado su huella de carbono`,
    letter: "N",
  },
];

export const RecognitionSeals: FC<RecognitionSealsProps> = ({
  recognitions,
  badgePreviews,
  size = 32,
}) => {
  return (
    <Box className="flex items-center gap-2">
      {SEAL_CONFIG.map((seal) => {
        if (!recognitions[seal.type]) return null;

        const badgeType = SUBMISSION_TYPE_TO_BADGE_TYPE[seal.type];
        const previewUrl = badgePreviews.find(
          (p) => p.badgeType === badgeType
        )?.previewUrl;

        const label = RECOGNITION_TYPE_CHIP_LABEL[seal.type];

        return (
          <Tooltip key={seal.type} title={seal.tooltip} arrow placement="top">
            {previewUrl ? (
              <Box
                component="img"
                src={previewUrl}
                alt={label}
                sx={{
                  width: size,
                  height: size,
                  objectFit: "contain",
                  borderRadius: "50%",
                  flexShrink: 0,
                  cursor: "default",
                }}
              />
            ) : (
              <Avatar
                sx={{
                  width: size,
                  height: size,
                  flexShrink: 0,
                  fontSize: size * 0.4,
                  fontWeight: 700,
                  cursor: "default",
                }}
              >
                {seal.letter}
              </Avatar>
            )}
          </Tooltip>
        );
      })}
    </Box>
  );
};
