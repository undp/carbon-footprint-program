import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { OverflowTooltipText } from "@/components";

interface DraftNameCellProps {
  name: string | null;
  organizationName: string | null;
}

export const DraftNameCell: FC<DraftNameCellProps> = ({
  name,
  organizationName,
}) => {
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
        <OverflowTooltipText variant="caption">
          {organizationName}
        </OverflowTooltipText>
      )}
      <OverflowTooltipText variant="body2">{name}</OverflowTooltipText>
    </Box>
  );
};
