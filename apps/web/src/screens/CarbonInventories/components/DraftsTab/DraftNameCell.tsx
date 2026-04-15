import { FC } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { useOverflowTooltip } from "@/screens/Maintainer/components/cells/useOverflowTooltip";

interface DraftNameCellProps {
  name: string | null;
  organizationName: string | null;
}

export const DraftNameCell: FC<DraftNameCellProps> = ({
  name,
  organizationName,
}) => {
  const { isOverflowed: isOrgOverflowed, overflowRef: orgOverflowRef } =
    useOverflowTooltip<HTMLSpanElement>([organizationName]);

  const { isOverflowed: isNameOverflowed, overflowRef: nameOverflowRef } =
    useOverflowTooltip<HTMLSpanElement>([name]);

  if (!name) {
    return (
      <Typography color="textDisabled" className="italic" variant="body2">
        (sin nombre)
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
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
    </Box>
  );
};
