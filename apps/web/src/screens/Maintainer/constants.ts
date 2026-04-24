import type { SelectOption } from "./types";

// Subcategory recommendations screen labels
export const SUBCATEGORY_RECOMMENDATIONS_LABELS = {
  SECTOR: "Sector",
  SUBSECTOR: "Subsector",
  ALL_SUBSECTORS: "Todos los subsectores",
  NO_SUBSECTOR: "Sin subsector especificado",
  SCREEN_TITLE: "Recomendaciones de Subcategorías",
  ADD_ROW: "Agregar recomendación",
  SUBCATEGORIES_COLUMN: "Subcategorías",
  EDIT_SUBCATEGORIES: "Editar subcategorías",
  SAVE_ROW: "Guardar",
  CANCEL_ROW: "Cancelar",
  DELETE_GROUP_CONFIRM: "¿Eliminar todas las recomendaciones de este grupo?",
} as const;

export const ALL_SUBSECTORS_VALUE: null = null;

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
