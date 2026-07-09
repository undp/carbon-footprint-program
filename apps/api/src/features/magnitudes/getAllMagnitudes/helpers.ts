import type { GetAllMagnitudesResponse } from "@repo/types";

const spanishCollator = new Intl.Collator("es");

// Sort in JS so the order is identical across deployments regardless of the
// database's default text collation (binary on Alpine, locale-aware on glibc).
// System magnitudes are pinned first; within each group rows are ordered by
// the Spanish-locale collation of `name`.
export const compareMagnitudesForDisplay = (
  a: GetAllMagnitudesResponse[number],
  b: GetAllMagnitudesResponse[number]
): number => {
  if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
  return spanishCollator.compare(a.name, b.name);
};
