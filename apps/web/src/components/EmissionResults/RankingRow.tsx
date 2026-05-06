import { FC } from "react";
import { Avatar, Box, Typography } from "@mui/material";
import { alpha, useTheme, type Theme } from "@mui/material/styles";
import type { RankingItem, RankingSeverity } from "@repo/types";
import { CategoryChip } from "./CategoryChip";
import { formatter } from "../../utils/formatting";

interface RankingRowProps {
  item: RankingItem;
}

const getSeverityColors = (
  severity: RankingSeverity,
  theme: Theme
): { text: string; bg: string } => {
  switch (severity) {
    case "HIGH":
      return {
        text: theme.palette.error.dark,
        bg: alpha(theme.palette.error.main, 0.1),
      };
    case "MEDIUM":
      return {
        text: theme.palette.warning.dark,
        bg: alpha(theme.palette.warning.main, 0.1),
      };
    case "LOW":
      return {
        text: theme.palette.success.dark,
        bg: alpha(theme.palette.success.main, 0.1),
      };
  }
};

export const RankingRow: FC<RankingRowProps> = ({ item }) => {
  const theme = useTheme();
  const colors = getSeverityColors(item.severity, theme);

  return (
    <Box className="flex items-center justify-between gap-2 pr-2">
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
          <CategoryChip
            label={item.categoryName}
            categoryColor={item.categoryColor}
          />
        </Box>
      </Box>
      <Box
        className="flex size-8 shrink-0 items-center justify-center rounded"
        sx={{ backgroundColor: colors.bg, px: 2.5 }}
      >
        <Typography
          variant="caption"
          fontWeight="fontWeightSemiBold"
          sx={{ color: colors.text }}
        >
          {formatter.percentage(item.percentage, { maximumFractionDigits: 0 })}
        </Typography>
      </Box>
    </Box>
  );
};
