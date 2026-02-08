import { FC, useState } from "react";
import { Box, Typography, Chip, Divider } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import type { RankingSeverity } from "@repo/types";

interface RankingItem {
  position: number;
  name: string;
  categoryId: string;
  subtotal: number;
  percentage: number;
  severity: RankingSeverity;
}

interface CategoryInfo {
  id: string;
  position: number;
  name: string;
  synonyms: string | null;
}

interface EmissionRankingCardProps {
  ownRankings: RankingItem[];
  sectorRankings: RankingItem[];
  categories: CategoryInfo[];
}

const SEVERITY_COLORS: Record<RankingSeverity, { text: string; bg: string }> = {
  HIGH: { text: "#C62828", bg: alpha("#D32F2F", 0.1) },
  MEDIUM: { text: "#E65100", bg: alpha("#ED6C02", 0.1) },
  LOW: { text: "#1B5E20", bg: alpha("#2E7D32", 0.1) },
};

function RankingRow({
  item,
  categoryName,
  categoryPosition,
}: {
  item: RankingItem;
  categoryName: string;
  categoryPosition: number;
}) {
  const theme = useTheme();
  const catKey = Math.min(categoryPosition, 3) as 1 | 2 | 3;
  const colors = SEVERITY_COLORS[item.severity];

  return (
    <Box className="flex items-center justify-between">
      <Box className="flex items-center gap-2">
        <Box
          className="flex size-10 shrink-0 items-center justify-center rounded-full"
          sx={{ backgroundColor: alpha(theme.palette.text.primary, 0.03) }}
        >
          <Typography variant="body1" fontWeight="fontWeightSemiBold">
            {item.position}
          </Typography>
        </Box>
        <Box className="flex flex-col gap-1">
          <Typography variant="body2">{item.name}</Typography>
          <Chip
            label={categoryName}
            size="small"
            sx={{
              backgroundColor: theme.palette.category[catKey].light,
              border: `1px solid ${theme.palette.category[catKey].light}`,
              color: theme.palette.category[catKey].dark,
              fontSize: "0.75rem",
              fontWeight: 500,
              height: "26px",
              borderRadius: "14px",
              "& .MuiChip-label": { px: 2, py: 0.75 },
            }}
          />
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
}

export const EmissionRankingCard: FC<EmissionRankingCardProps> = ({
  ownRankings,
  sectorRankings,
  categories,
}) => {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState<"own" | "sector">("own");

  const rankings = viewMode === "own" ? ownRankings : sectorRankings;

  // Build a lookup: categoryId -> position
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <Box className="border-grey-300 flex h-full w-full flex-col gap-6 rounded-xl border bg-white p-4">
      <Box className="flex items-center justify-between">
        <Typography variant="body1" fontWeight="fontWeightMedium">
          Ranking emisiones
        </Typography>
        <Box className="border-primary flex overflow-hidden rounded border">
          <Box
            className="cursor-pointer px-2 py-1"
            sx={{
              backgroundColor:
                viewMode === "own" ? theme.palette.primary.main : "transparent",
              backdropFilter: "blur(10px)",
              boxShadow: "0px 4px 4px 0px rgba(0, 0, 0, 0.06)",
            }}
            onClick={() => setViewMode("own")}
          >
            <Typography
              variant="caption"
              fontWeight="fontWeightMedium"
              sx={{
                color:
                  viewMode === "own"
                    ? theme.palette.common.white
                    : theme.palette.primary.main,
              }}
            >
              VER PROPIAS
            </Typography>
          </Box>
          <Box
            className="cursor-pointer px-2 py-1"
            sx={{
              backgroundColor:
                viewMode === "sector"
                  ? theme.palette.primary.main
                  : "transparent",
              backdropFilter: "blur(10px)",
              boxShadow: "0px 4px 4px 0px rgba(0, 0, 0, 0.06)",
            }}
            onClick={() => setViewMode("sector")}
          >
            <Typography
              variant="caption"
              fontWeight="fontWeightMedium"
              sx={{
                color:
                  viewMode === "sector"
                    ? theme.palette.common.white
                    : theme.palette.primary.main,
              }}
            >
              VER RUBRO
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {rankings.map((item, index) => (
          <Box
            key={`${item.position}-${item.name}`}
            className="flex flex-col gap-3"
          >
            <RankingRow
              item={item}
              categoryName={categoryMap.get(item.categoryId)?.name ?? ""}
              categoryPosition={categoryMap.get(item.categoryId)?.position ?? 3}
            />
            {index < rankings.length - 1 && <Divider sx={{ opacity: 0.2 }} />}
          </Box>
        ))}
      </Box>
    </Box>
  );
};
