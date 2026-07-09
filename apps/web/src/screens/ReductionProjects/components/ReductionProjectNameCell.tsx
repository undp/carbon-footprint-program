import { FC } from "react";
import { Box } from "@mui/material";
import { OverflowTooltipText } from "@/components";

interface ReductionProjectNameCellProps {
  name: string;
  organizationName: string;
}

export const ReductionProjectNameCell: FC<ReductionProjectNameCellProps> = ({
  name,
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
      <OverflowTooltipText variant="caption">
        {organizationName}
      </OverflowTooltipText>
      <OverflowTooltipText variant="body2">{name}</OverflowTooltipText>
    </Box>
  );
};
