import { AppHttpError } from "@/api/http/errors";

type ErrorDetails = Record<string, unknown> | undefined;
type DetailsAwareMessage = (details: ErrorDetails) => string;

const RESOURCE_LABELS: Record<
  string,
  { article: string; sentenceArticle: string }
> = {
  CountrySector: { article: "el rubro", sentenceArticle: "El rubro" },
  CountrySubsector: { article: "el subrubro", sentenceArticle: "El subrubro" },
  OrganizationMainActivity: {
    article: "la actividad principal",
    sentenceArticle: "La actividad principal",
  },
  CountryOrganizationSize: {
    article: "el tamaño de organización",
    sentenceArticle: "El tamaño de organización",
  },
};

const ERROR_MESSAGES: Record<string, string | DetailsAwareMessage> = {
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

  // Profiling catalogs (sectors / subsectors / main activities / sizes).
  // The API attaches structured `details` (e.g. resourceType, parentType, parentName)
  // and we compose the user-facing Spanish copy here.
  DATABASE_UNIQUE_CONSTRAINT_VIOLATION: (details) => {
    const resourceType = details?.resourceType;
    if (resourceType === "CountrySector")
      return "Ya existe un rubro activo con ese nombre.";
    if (resourceType === "CountrySubsector")
      return "Ya existe un subrubro activo con ese nombre dentro del rubro indicado.";
    if (resourceType === "OrganizationMainActivity")
      return "Ya existe una actividad principal activa con ese nombre y la misma combinación de rubro/subrubro.";
    if (resourceType === "CountryOrganizationSize")
      return "Ya existe un tamaño de organización activo con ese nombre.";
    return "Ya existe un registro con este valor.";
  },
  RESTORE_ON_ACTIVE: (details) => {
    const label =
      RESOURCE_LABELS[details?.resourceType as string]?.sentenceArticle;
    if (label) return `${label} ya se encuentra activo.`;
    return "El registro ya se encuentra activo.";
  },
  PARENT_NOT_ACTIVE: (details) => {
    const resource = RESOURCE_LABELS[details?.resourceType as string];
    const parent = RESOURCE_LABELS[details?.parentType as string];
    const resourceName =
      typeof details?.resourceName === "string"
        ? details.resourceName
        : undefined;
    const parentName =
      typeof details?.parentName === "string" ? details.parentName : undefined;
    if (resource && parent && resourceName && parentName) {
      return `No se puede restaurar ${resource.article} "${resourceName}" porque ${parent.article} "${parentName}" está eliminado. Restáuralo primero.`;
    }
    return "No se puede restaurar este registro porque su entidad padre está eliminada. Restáurala primero.";
  },
  SECTOR_SUBSECTOR_MISMATCH:
    "El subrubro seleccionado no pertenece al rubro indicado.",
  SAME_ORGANIZATION_SIZE: "No se puede reordenar un tamaño consigo mismo.",
  ORGANIZATION_SIZES_DIFFERENT_COUNTRY:
    "No se pueden reordenar tamaños de organizaciones de diferentes países.",
  INACTIVE_ORGANIZATION_SIZE: "Solo se pueden reordenar tamaños activos.",
};

/**
 * Extracts the API error code (e.g., "PARENT_NOT_ACTIVE") from a thrown HTTP error so
 * callers can branch on it. Returns null when the error isn't an `AppHttpError` or has
 * no code attached.
 */
export const getApiErrorCode = (error: unknown): string | null => {
  if (error instanceof AppHttpError) {
    return error.errorCode ?? null;
  }
  return null;
};

export const getApiErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  if (error instanceof AppHttpError) {
    const code = error.errorCode;
    if (code && Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, code)) {
      const entry = ERROR_MESSAGES[code];
      return typeof entry === "function" ? entry(error.apiDetails) : entry;
    }
  }
  return fallback;
};
