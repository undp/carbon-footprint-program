import { AppHttpError } from "@/api/http/errors";

const ERROR_MESSAGES: Record<string, string> = {
  // Categories
  CATEGORY_NAME_ALREADY_EXISTS:
    "Ya existe una categoría con este nombre en esta metodología.",
  CATEGORY_POSITION_ALREADY_EXISTS:
    "Ya existe una categoría con esta posición en esta metodología.",
  METHODOLOGY_VERSION_NOT_FOUND_FOR_CATEGORY:
    "La versión de metodología no fue encontrada.",

  // Subcategories
  SUBCATEGORY_NAME_ALREADY_EXISTS:
    "Ya existe una sub-categoría con este nombre en esta categoría.",
  CATEGORY_NOT_FOUND_FOR_SUBCATEGORY:
    "La categoría asociada no fue encontrada.",
  CATEGORY_FROM_DIFFERENT_METHODOLOGY:
    "La categoría debe pertenecer a la misma metodología.",

  // Emission factors
  EMISSION_FACTOR_NOT_FOUND: "El factor de emisión no fue encontrado.",
  EMISSION_FACTOR_DUPLICATE:
    "Ya existe un factor de emisión con la misma sub-categoría, variables y fuente.",
  SUBCATEGORY_NOT_FOUND_FOR_EMISSION_FACTOR:
    "La sub-categoría asociada no fue encontrada.",
  RATE_MEASUREMENT_UNIT_NOT_FOUND:
    "La unidad de tasa seleccionada no fue encontrada.",
  EMISSION_FACTOR_SOURCE_CONFLICT:
    "Todos los factores de emisión activos de esta sub-categoría deben usar la misma fuente.",
  EMISSION_FACTOR_GAS_DETAILS_MISMATCH:
    "La suma del desglose GEI debe coincidir con el valor declarado.",

  // Emission factor dimensions
  EMISSION_FACTOR_DIMENSION_NOT_FOUND: "La dimensión no fue encontrada.",
  DIMENSION_NOT_CONFIGURED: "La dimensión no está configurada.",
  DIMENSION_VALUE_NOT_FOUND: "La variable de la dimensión no fue encontrada.",
  DIMENSION_VALUES_CANNOT_BE_REMOVED:
    "No se pueden eliminar variables de una dimensión que tiene factores de emisión activos.",
  DIMENSION_IS_REQUIRED_CHANGE_BLOCKED:
    "No se puede cambiar el campo 'requerido' porque existen factores de emisión activos para esta subcategoría.",
  DIMENSION_VALUE_NOT_FOUND_FOR_RENAME:
    "La variable a renombrar no fue encontrada.",
  MAX_DIMENSIONS_PER_SUBCATEGORY: "La subcategoría ya tiene 2 dimensiones.",
  DIMENSION_POSITION_ALREADY_TAKEN:
    "La posición ya está ocupada para esta subcategoría.",
  DIMENSION_MUST_HAVE_AT_LEAST_ONE_VALUE:
    "La dimensión debe tener al menos una variable.",
  DUPLICATE_DIMENSION_VALUE:
    "Ya existe una variable con ese nombre en esta dimensión.",
  DIMENSION_VALUE_NOT_FOUND_FOR_REMOVAL:
    "La variable a eliminar no fue encontrada.",

  // Reduction plan initiatives
  REDUCTION_PLAN_INITIATIVE_TITLE_ALREADY_EXISTS:
    "Ya existe una iniciativa con este título en esta sub-categoría.",
  SUBCATEGORY_NOT_FOUND_FOR_REDUCTION_PLAN_INITIATIVE:
    "La sub-categoría asociada no fue encontrada.",
  REDUCTION_PLAN_INITIATIVE_NOT_FOUND: "La iniciativa no fue encontrada.",

  // Methodologies
  METHODOLOGY_NAME_VERSION_ALREADY_EXISTS:
    "Ya existe una metodología con este nombre y versión.",
  METHODOLOGY_IS_PUBLISHED: "No se puede modificar una metodología publicada.",
  METHODOLOGY_HAS_ACTIVE_INVENTORIES:
    "No se puede eliminar la metodología porque tiene inventarios de carbono activos.",
  METHODOLOGY_IS_DELETED: "La metodología ya fue eliminada.",

  // Profiling catalogs (rubros / subrubros / actividades / tamaños). Services set a
  // Spanish, context-specific sentence on the thrown error's `message` (surfaced via
  // `error.apiMessage`) so the FE doesn't need a fallback per code; these entries are
  // here only for codes whose API messages remain in English.
  RESTORE_ON_ACTIVE: "El registro ya se encuentra activo.",
  SECTOR_SUBSECTOR_MISMATCH:
    "El subrubro seleccionado no pertenece al rubro indicado.",
};

export const getApiErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  if (error instanceof AppHttpError) {
    const code = error.errorCode;
    if (code && code in ERROR_MESSAGES) {
      // Prefer the per-code static fallback for legacy error codes whose API messages
      // remain in English (the static map carries the Spanish copy).
      return ERROR_MESSAGES[code];
    }
    // For new error codes (e.g., profiling maintainers), services set the thrown
    // error's `message` to a Spanish sentence — surface it directly so the FE doesn't
    // need a code-by-code fallback.
    const apiMessage = error.apiMessage;
    if (apiMessage) {
      return apiMessage;
    }
  }
  return fallback;
};
