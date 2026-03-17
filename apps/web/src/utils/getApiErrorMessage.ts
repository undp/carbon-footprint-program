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

  // Methodologies
  METHODOLOGY_NAME_VERSION_ALREADY_EXISTS:
    "Ya existe una metodología con este nombre y versión.",
  METHODOLOGY_IS_PUBLISHED: "No se puede modificar una metodología publicada.",
  METHODOLOGY_HAS_ACTIVE_INVENTORIES:
    "No se puede eliminar la metodología porque tiene inventarios de carbono activos.",
  METHODOLOGY_IS_DELETED: "La metodología ya fue eliminada.",
};

export const getApiErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  if (error instanceof AppHttpError) {
    const code = error.errorCode;
    if (code && code in ERROR_MESSAGES) {
      return ERROR_MESSAGES[code];
    }
  }
  return fallback;
};
