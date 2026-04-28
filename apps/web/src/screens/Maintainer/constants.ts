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

export const SUBCATEGORY_RECOMMENDATIONS_LABELS = {
  title: "Recomendaciones de Subcategorías",
  description:
    "Gestiona qué subcategorías se pre-seleccionan al crear inventarios según el sector y subsector de la organización.",
  addRecommendation: "Agregar recomendación",
  searchPlaceholder: "Buscar subcategoría o categoría",
  clearSearchAriaLabel: "Limpiar búsqueda",
  saveRowAriaLabel: "Guardar cambios",
  cancelRowAriaLabel: "Descartar cambios",
  methodologyLabel: "Metodología:",
  nullSubsectorLabel: "Todos los subsectores",
  editSubcategoriesTitle: "Editar subcategorías",
  emptyConfirmTitle: "¿Eliminar todas las recomendaciones de este grupo?",
  emptyConfirmBody:
    "Al guardar sin subcategorías, todas las recomendaciones de este grupo serán eliminadas.",
} as const;
