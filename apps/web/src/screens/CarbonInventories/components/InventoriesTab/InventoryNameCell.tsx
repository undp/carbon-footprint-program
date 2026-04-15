import React from "react";
import { FC } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { GetAllCarbonInventoriesResponse } from "@repo/types";
import { RECOGNITION_TYPE_LABEL } from "@/utils/recognitions";
import { RecognitionChip } from "@/components";
import { useOverflowTooltip } from "@/screens/Maintainer/components/cells/useOverflowTooltip";

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
  const { isOverflowed: isOrgOverflowed, overflowRef: orgOverflowRef } =
    useOverflowTooltip<HTMLSpanElement>([organizationName]);

  const { isOverflowed: isNameOverflowed, overflowRef: nameOverflowRef } =
    useOverflowTooltip<HTMLSpanElement>([name]);

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
        <Tooltip
          title={isOrgOverflowed ? organizationName : ""}
          arrow
          placement="top"
          enterDelay={500}
        >
          <Typography
            ref={orgOverflowRef}
            variant="caption"
            noWrap
            maxWidth="100%"
          >
            {organizationName}
          </Typography>
        </Tooltip>
      )}
      {name ? (
        <Tooltip
          title={isNameOverflowed ? name : ""}
          arrow
          placement="top"
          enterDelay={500}
        >
          <Typography
            ref={nameOverflowRef}
            variant="body2"
            noWrap
            maxWidth="100%"
          >
            {name}
          </Typography>
        </Tooltip>
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
