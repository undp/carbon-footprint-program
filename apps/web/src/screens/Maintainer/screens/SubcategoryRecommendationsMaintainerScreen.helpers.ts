import type { GetAllCountrySectorsResponse } from "@repo/types";

export const buildRowId = (
  sectorId: string,
  subsectorId: string | null
): string => `${sectorId}-${subsectorId ?? "null"}`;

export const findSectorAndSubsectorNames = (
  sectors: GetAllCountrySectorsResponse,
  sectorId: string,
  subsectorId: string | null
): { sectorName: string; subsectorName: string | null } => {
  const sector = sectors.find((s) => s.id === sectorId);
  const subsector =
    subsectorId !== null
      ? (sector?.subsectors.find((sub) => sub.id === subsectorId) ?? null)
      : null;
  return {
    sectorName: sector?.name ?? "",
    subsectorName: subsector?.name ?? null,
  };
};
