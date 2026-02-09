import { FC, useState } from "react";
import { Box, Typography, Divider } from "@mui/material";
import { StyledToggleButtonGroup } from "@/components/StyledToggleButtonGroup";
import { EmptyStateMessage } from "./EmptyStateMessage";
import { RankingRow } from "./RankingRow";
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

export const EmissionRankingCard: FC<EmissionRankingCardProps> = ({
  ownRankings,
  sectorRankings,
  categories,
}) => {
  const [viewMode, setViewMode] = useState<"own" | "sector">("own");

  const rankings = viewMode === "own" ? ownRankings : sectorRankings;

  // Build a lookup: categoryId -> position
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

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
        {rankings.length === 0 ? (
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
              key={`${item.position}-${item.name}`}
              className="flex flex-col gap-3"
            >
              <RankingRow
                item={item}
                categoryName={categoryMap.get(item.categoryId)?.name ?? ""}
                categoryPosition={
                  categoryMap.get(item.categoryId)?.position ?? 3
                }
              />
              {index < rankings.length - 1 && <Divider sx={{ opacity: 0.2 }} />}
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};
