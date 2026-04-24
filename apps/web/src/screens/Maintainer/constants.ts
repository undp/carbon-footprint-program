import type { SelectOption } from "./types";

export const NORMATIVA_OPTIONS: SelectOption[] = [
  { label: "GHG Protocol", value: "GHG Protocol" },
  { label: "ISO 14064", value: "ISO 14064" },
  { label: "ISO 14067", value: "ISO 14067" },
  { label: "PAS 2050", value: "PAS 2050" },
];

// TODO: move to a database table and populate via seeds
export const SOURCE_OPTIONS: SelectOption[] = [
  { label: "DEFRA 2025", value: "DEFRA 2025" },
  { label: "HuellaChile", value: "HuellaChile" },
  { label: "EPA", value: "EPA" },
  { label: "IPCC", value: "IPCC" },
  { label: "GHG Protocol", value: "GHG Protocol" },
];

// Subcategory recommendations maintainer
export const SUBCATEGORY_RECOMMENDATIONS_LABELS = {
  screenTitle: "Recomendaciones de Subcategorías",
  addRow: "Agregar recomendación",
  sectorColumn: "Sector",
  subsectorColumn: "Subsector",
  subcategoriesColumn: "Subcategorías",
  editSubcategories: "Editar subcategorías",
  allSubsectors: "Todos los subsectores",
  noSubsectorSpecified: "Sin subsector especificado",
  emptyGroupConfirmTitle: "¿Eliminar todas las recomendaciones de este grupo?",
  emptyGroupConfirmBody:
    "Al guardar sin subcategorías, todas las recomendaciones de este grupo serán eliminadas.",
} as const;

export const ALL_SUBSECTORS_VALUE = null;
