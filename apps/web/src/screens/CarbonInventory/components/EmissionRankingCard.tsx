import { FC, useState } from "react";
import { Box, Typography, Chip } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

interface RankingItem {
  rank: number;
  name: string;
  category: 1 | 2 | 3;
  percentage: number;
  severity: "high" | "medium" | "low";
}

interface EmissionRankingCardProps {
  ownRankings: RankingItem[];
  sectorRankings: RankingItem[];
}

const getCategoryLabel = (category: 1 | 2 | 3): string => {
  switch (category) {
    case 1:
      return "ALCANCE 1";
    case 2:
      return "ALCANCE 2";
    case 3:
      return "ALCANCE 3";
  }
};

const getSeverityColor = (severity: "high" | "medium" | "low"): string => {
  switch (severity) {
    case "high":
      return "#C62828";
    case "medium":
      return "#E65100";
    case "low":
      return "#1B5E20";
  }
};

const getSeverityBg = (severity: "high" | "medium" | "low"): string => {
  switch (severity) {
    case "high":
      return alpha("#D32F2F", 0.1);
    case "medium":
      return alpha("#ED6C02", 0.1);
    case "low":
      return alpha("#2E7D32", 0.1);
  }
};

export const EmissionRankingCard: FC<EmissionRankingCardProps> = ({
  ownRankings,
  sectorRankings,
}) => {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState<"own" | "sector">("own");

  const rankings = viewMode === "own" ? ownRankings : sectorRankings;

  return (
    <Box className="flex h-[265px] w-full flex-col gap-6 rounded-xl border border-grey-300 bg-white p-4">
      <Box className="flex items-center justify-between">
        <Typography variant="body1" fontWeight="fontWeightMedium">
          Ranking emisiones
        </Typography>
        <Box className="flex overflow-hidden rounded border border-primary">
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
          <Box key={index} className="flex flex-col gap-3">
            <Box className="flex items-center justify-between">
              <Box className="flex items-center gap-2">
                <Box
                  className="flex size-10 items-center justify-center rounded-full"
                  sx={{ backgroundColor: alpha(theme.palette.text.primary, 0.03) }}
                >
                  <Typography variant="body1" fontWeight="fontWeightSemiBold">
                    {item.rank}
                  </Typography>
                </Box>
                <Box className="flex flex-col gap-1">
                  <Typography variant="body2">{item.name}</Typography>
                  <Chip
                    label={getCategoryLabel(item.category)}
                    size="small"
                    sx={{
                      backgroundColor:
                        theme.palette.category[item.category].light,
                      border: `1px solid ${theme.palette.category[item.category].light}`,
                      color: theme.palette.category[item.category].dark,
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      height: "26px",
                      borderRadius: "14px",
                      "& .MuiChip-label": {
                        px: 2,
                        py: 0.75,
                      },
                    }}
                  />
                </Box>
              </Box>
              <Box
                className="flex size-8 items-center justify-center rounded"
                sx={{
                  backgroundColor: getSeverityBg(item.severity),
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight="fontWeightSemiBold"
                  sx={{ color: getSeverityColor(item.severity) }}
                >
                  {item.percentage}%
                </Typography>
              </Box>
            </Box>
            {index < rankings.length - 1 && (
              <Box
                className="h-[0.5px] w-full"
                sx={{
                  backgroundColor: theme.palette.text.primary,
                  opacity: 0.2,
                }}
              />
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};
