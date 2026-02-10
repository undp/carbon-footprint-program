import { FC, useState } from "react";
import { Box, Divider, Skeleton, Typography } from "@mui/material";
import { StyledToggleButtonGroup } from "@/components/StyledToggleButtonGroup";
import { EmptyStateMessage } from "./EmptyStateMessage";
import { RankingRow } from "./RankingRow";
import type { RankingItem } from "@repo/types";

interface EmissionRankingCardProps {
  ownRankings: RankingItem[];
  sectorRankings: RankingItem[];
  isLoading?: boolean;
}

export const EmissionRankingCard: FC<EmissionRankingCardProps> = ({
  ownRankings,
  sectorRankings,
  isLoading = false,
}) => {
  const [viewMode, setViewMode] = useState<"own" | "sector">("own");

  const rankings = viewMode === "own" ? ownRankings : sectorRankings;

  return (
    <Box className="border-grey-300 flex h-full min-h-0 w-full flex-col gap-4 rounded-xl border bg-white p-4">
      <Box className="flex items-center justify-between px-2">
        <Typography variant="body1" fontWeight="fontWeightMedium">
          Ranking emisiones
        </Typography>
        <StyledToggleButtonGroup
          sx={{
            height: 20,
          }}
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: "own", label: "VER PROPIAS" },
            { value: "sector", label: "VER RUBRO" },
          ]}
        />
      </Box>

      <Box className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <Box key={i} className="flex flex-col gap-3">
              <Box className="flex items-center gap-2 px-1">
                <Skeleton variant="circular" width={40} height={40} />
                <Box className="flex flex-1 flex-col">
                  <Skeleton
                    variant="text"
                    sx={{ flex: 1, mr: 5 }}
                    height={24}
                  />
                  <Skeleton variant="text" width={150} height={36} />
                </Box>
                <Skeleton variant="text" width={40} height={36} />
              </Box>
              {i < 5 && <Divider sx={{ opacity: 0.2 }} />}
            </Box>
          ))
        ) : rankings.length === 0 ? (
          <EmptyStateMessage
            message={
              viewMode === "own"
                ? "Luego de registrar actividades, sabrás cuáles son las que más emiten huella de carbono"
                : "Después de perfilar tu empresa, podrás ver un ranking de emisiones de empresas de tu rubro"
            }
          />
        ) : (
          rankings.map((item, index) => (
            <Box
              key={`${item.rank}-${item.name}`}
              className="flex flex-col gap-3"
            >
              <RankingRow item={item} />
              {index < rankings.length - 1 && <Divider sx={{ opacity: 0.2 }} />}
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};
