import { FC } from "react";
import { Avatar, Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import type { RankingSeverity } from "@repo/types";
import { CategoryChip } from "./CategoryChip";

interface RankingRowItem {
  rank: number;
  name: string;
  percentage: number;
  severity: RankingSeverity;
}

interface RankingRowProps {
  item: RankingRowItem;
  categoryName: string;
  categoryPosition: number;
}

const SEVERITY_COLORS: Record<RankingSeverity, { text: string; bg: string }> = {
  HIGH: { text: "#C62828", bg: alpha("#D32F2F", 0.1) },
  MEDIUM: { text: "#E65100", bg: alpha("#ED6C02", 0.1) },
  LOW: { text: "#1B5E20", bg: alpha("#2E7D32", 0.1) },
};

export const RankingRow: FC<RankingRowProps> = ({
  item,
  categoryName,
  categoryPosition,
}) => {
  const theme = useTheme();
  const colors = SEVERITY_COLORS[item.severity];

  return (
    <Box className="flex items-center justify-between pr-2">
      <Box className="flex items-center gap-2">
        <Avatar
          sx={{
            width: 40,
            height: 40,
            backgroundColor: alpha(theme.palette.text.primary, 0.03),
            color: theme.palette.text.primary,
            fontSize: "1rem",
            fontWeight: "fontWeightSemiBold",
          }}
        >
          {item.rank}
        </Avatar>
        <Box className="flex flex-col items-start gap-1">
          <Typography variant="body2">{item.name}</Typography>
          <CategoryChip label={categoryName} categoryPosition={categoryPosition} />
        </Box>
      </Box>
      <Box
        className="flex size-8 shrink-0 items-center justify-center rounded"
        sx={{ backgroundColor: colors.bg }}
      >
        <Typography
          variant="caption"
          fontWeight="fontWeightSemiBold"
          sx={{ color: colors.text }}
        >
          {Math.round(item.percentage * 100)}%
        </Typography>
      </Box>
    </Box>
  );
};
