import { FC } from "react";
import { Avatar, Box, Tooltip } from "@mui/material";
import {
  GetTransparencyDataResponse,
  SubmissionType,
  CarbonInventoryRecognitionsType,
  GetBadgePreviewsResponse,
} from "@repo/types";
import { SUBMISSION_TYPE_TO_BADGE_TYPE } from "@/screens/Recognitions/constants";
import { RECOGNITION_TYPE_CHIP_LABEL } from "@/utils/recognitions";
import { VOCAB } from "@/config/vocab";

interface Props {
  recognitions: GetTransparencyDataResponse[number]["recognitions"];
  badgePreviews: GetBadgePreviewsResponse;
  size?: number;
}

const orgArticle = VOCAB.organization.article.singular;

const BADGE_CONFIG: {
  type: CarbonInventoryRecognitionsType;
  tooltip: string;
  letter: string;
}[] = [
  {
    type: SubmissionType.CARBON_INVENTORY_CALCULATION,
    tooltip: `Reconocimiento Medición — ${orgArticle} ha medido y autodeclarado su huella de carbono.`,
    letter: "M",
  },
  {
    type: SubmissionType.CARBON_INVENTORY_VERIFICATION,
    tooltip: `Reconocimiento Verificación — ${orgArticle} ha verificado su huella de carbono.`,
    letter: "V",
  },
  {
    type: SubmissionType.REDUCTION_PROJECT_VERIFICATION,
    tooltip: `Reconocimiento Reducción — ${orgArticle} ha reducido su huella de carbono.`,
    letter: "R",
  },
  // TODO: Re-enable the NEUTRALIZATION_PLAN_VERIFICATION badge here once the admin
  // neutralization module is implemented.
];

export const RecognitionBadge: FC<Props> = ({
  recognitions,
  badgePreviews,
  size = 32,
}) => {
  return (
    <Box className="flex items-center gap-2">
      {BADGE_CONFIG.map((seal) => {
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
