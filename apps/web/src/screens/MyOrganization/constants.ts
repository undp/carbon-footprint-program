import { OrganizationRole } from "@repo/types";
import type { TerritoryLevel } from "@repo/types";
import { ORGANIZATION_ROLE_LABELS } from "@/labels/chips/role";

export const ROLE_OPTIONS = (
  Object.entries(ORGANIZATION_ROLE_LABELS) as [OrganizationRole, string][]
).map(([value, label]) => ({ label, value }));

export const REPRESENTATIVE_DOCUMENT_LABEL =
  "Documento de identidad del representante";

/**
 * The document itself is not stored as a separate type: the note tells the
 * registrant which one to enter, and the number identifies it well enough on its
 * own — a cédula carries the country's fixed format, a passport does not.
 */
export const REPRESENTATIVE_DOCUMENT_HELPER_TEXT =
  "Cédula de identidad y electoral para personas dominicanas; pasaporte para personas extranjeras que no posean cédula dominicana.";

/**
 * The territorial hierarchy from outermost to innermost. The organization form
 * renders one selector per entry, and only stores the innermost node the
 * registrant actually reaches — the rest of the chain is derived from it.
 */
export const TERRITORY_LEVEL_ORDER = [
  "PLANNING_REGION",
  "PROVINCE",
  "MUNICIPALITY",
  "MUNICIPAL_DISTRICT",
  "SECTOR",
] as const satisfies readonly TerritoryLevel[];

export const TERRITORY_LEVEL_COUNT = TERRITORY_LEVEL_ORDER.length;

export const TERRITORY_LEVEL_LABELS: Record<TerritoryLevel, string> = {
  PLANNING_REGION: "Región de planificación",
  PROVINCE: "Provincia",
  MUNICIPALITY: "Municipio",
  MUNICIPAL_DISTRICT: "Distrito municipal",
  SECTOR: "Sector o paraje",
};
