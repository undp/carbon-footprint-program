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
