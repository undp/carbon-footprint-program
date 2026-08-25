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
 * The territorial hierarchy from outermost to innermost, as the observations
 * define it. The form only renders the levels the catalog actually holds rows
 * for, which today stops at the municipality; the order is what maps a level
 * onto its position in the form's `territoryIds`.
 *
 * Only the innermost node the registrant actually reaches is stored — the rest
 * of the chain is derived from it.
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

/**
 * What a locked selector shows instead of its own name: the level below stays on
 * screen and says which answer unlocks it, the way the economic activity does
 * while its sector is unanswered.
 */
export const TERRITORY_LEVEL_PROMPTS: Record<TerritoryLevel, string> = {
  PLANNING_REGION: "Selecciona la región de planificación",
  PROVINCE: "Selecciona la provincia",
  MUNICIPALITY: "Selecciona el municipio",
  MUNICIPAL_DISTRICT: "Selecciona el distrito municipal",
  SECTOR: "Selecciona el sector o paraje",
};
