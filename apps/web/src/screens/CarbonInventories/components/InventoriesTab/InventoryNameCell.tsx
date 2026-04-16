import React, { FC } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { GetAllCarbonInventoriesResponse } from "@repo/types";
import { RECOGNITION_TYPE_LABEL } from "@/utils/recognitions";
import { OverflowTooltipText, RecognitionChip } from "@/components";

interface InventoryNameCellProps {
  name: string | null;
  recognitions: GetAllCarbonInventoriesResponse[number]["recognitions"];
  organizationName?: string | null;
}

export const InventoryNameCell: FC<InventoryNameCellProps> = ({
  name,
  recognitions,
  organizationName,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 0.75,
        overflow: "hidden",
        width: "100%",
      }}
    >
      {organizationName && (
        <OverflowTooltipText variant="caption">
          {organizationName}
        </OverflowTooltipText>
      )}
      {name ? (
        <OverflowTooltipText variant="body2">{name}</OverflowTooltipText>
      ) : (
        <Typography color="textDisabled" className="italic" variant="body2">
          (sin nombre)
        </Typography>
      )}
      {recognitions.length > 0 && (
        <Box className="flex flex-row items-center gap-1">
          {recognitions.map((recognition) => (
            <React.Fragment key={`${recognition}-recognition`}>
              <Tooltip title={RECOGNITION_TYPE_LABEL[recognition]}>
                <span>
                  <RecognitionChip type={recognition} />
                </span>
              </Tooltip>
            </React.Fragment>
          ))}
        </Box>
      )}
    </Box>
  );
};
