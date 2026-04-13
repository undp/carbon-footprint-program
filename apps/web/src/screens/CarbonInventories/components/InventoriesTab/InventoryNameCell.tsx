import { FC } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import {
  CarbonInventoryDisplayStatus,
  CarbonInventoryDisplayStatusEnum,
  SubmissionType,
} from "@repo/types";
import { REQUEST_TYPE_LABEL } from "@/utils/submissions";
import { RecognitionChip } from "../../../../components";

const MEASUREMENT_STATUSES: CarbonInventoryDisplayStatus[] = [
  CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED,
  CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_VERIFICATION,
  CarbonInventoryDisplayStatusEnum.VERIFICATION_REVIEWED,
  CarbonInventoryDisplayStatusEnum.VERIFICATION_REJECTED,
  CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED,
];

const VERIFICATION_STATUSES: CarbonInventoryDisplayStatus[] = [
  CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED,
];

interface InventoryNameCellProps {
  name: string | null;
  status: CarbonInventoryDisplayStatus;
}

export const InventoryNameCell: FC<InventoryNameCellProps> = ({
  name,
  status,
}) => {
  const hasMeasurementRecognition = MEASUREMENT_STATUSES.includes(status);
  const hasVerificationRecognition = VERIFICATION_STATUSES.includes(status);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 0.75,
        py: 1,
      }}
    >
      {name ? (
        <Tooltip title={name}>
          <Typography variant="body2" noWrap maxWidth="100%">
            {name}
          </Typography>
        </Tooltip>
      ) : (
        <Typography color="textDisabled" className="italic" variant="body2">
          (sin nombre)
        </Typography>
      )}
      {(hasMeasurementRecognition || hasVerificationRecognition) && (
        <Box sx={{ display: "flex", gap: 1 }}>
          {hasMeasurementRecognition && (
            <Tooltip
              title={
                REQUEST_TYPE_LABEL[SubmissionType.CARBON_INVENTORY_CALCULATION]
              }
            >
              <span>
                <RecognitionChip
                  type={SubmissionType.CARBON_INVENTORY_CALCULATION}
                />
              </span>
            </Tooltip>
          )}
          {hasVerificationRecognition && (
            <Tooltip
              title={
                REQUEST_TYPE_LABEL[SubmissionType.CARBON_INVENTORY_VERIFICATION]
              }
            >
              <span>
                <RecognitionChip
                  type={SubmissionType.CARBON_INVENTORY_VERIFICATION}
                />
              </span>
            </Tooltip>
          )}
        </Box>
      )}
    </Box>
  );
};
