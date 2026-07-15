import { describe, expect, it } from "vitest";
import { AppHttpError } from "@/api/http/errors";
import type { ApiErrorBody, NormalizedError } from "@/api/http/errors";
import {
  getApiErrorCode,
  getApiErrorMessage,
  getApiErrorMessageFromCode,
} from "./getApiErrorMessage";

// A distinctive fallback so any accidental fall-through is obvious in a failure.
const FALLBACK = "MENSAJE_DE_RESERVA";

/**
 * Build an `AppHttpError` whose `.errorCode` / `.apiDetails` resolve from an
 * `ApiErrorBody`-shaped payload, exactly as `ky`'s error normalizer produces.
 * The details-dependent entries in `getApiErrorMessage` read `apiDetails`, so
 * `details` flows straight through here.
 */
const httpErrorWithCode = (
  code: string,
  details?: Record<string, unknown>
): AppHttpError => {
  const body: ApiErrorBody = {
    code,
    message: "developer-facing message",
    details,
  };
  const detail: NormalizedError = {
    kind: "unknown",
    message: body.message,
    status: 400,
    request: { url: "https://api.test/resource", method: "POST" },
    body,
  };
  return new AppHttpError(detail);
};

/**
 * An `AppHttpError` whose body is NOT an `ApiErrorBody` (no machine `code`), so
 * `errorCode` / `apiDetails` are `undefined` — the "wrapped error without a
 * usable code" path.
 */
const httpErrorWithoutCode = (): AppHttpError =>
  new AppHttpError({
    kind: "unknown",
    message: "boom",
    status: 500,
    request: { url: "https://api.test/resource", method: "GET" },
    body: { message: "no machine code here" },
  });

// Inputs that are not `AppHttpError` instances. Both accessors must ignore them.
const NON_APP_HTTP_ERRORS: ReadonlyArray<readonly [string, unknown]> = [
  ["a plain Error", new Error("boom")],
  ["null", null],
  ["undefined", undefined],
  ["a string", "PARENT_NOT_ACTIVE"],
  ["a number", 42],
  // A lookalike payload that was never wrapped in AppHttpError.
  [
    "a bare ApiErrorBody-shaped object",
    { code: "PARENT_NOT_ACTIVE", message: "x" },
  ],
];

describe("getApiErrorCode", () => {
  it("returns the code from an AppHttpError carrying an ApiErrorBody", () => {
    expect(getApiErrorCode(httpErrorWithCode("PARENT_NOT_ACTIVE"))).toBe(
      "PARENT_NOT_ACTIVE"
    );
  });

  it("returns null when the AppHttpError body has no code", () => {
    expect(getApiErrorCode(httpErrorWithoutCode())).toBeNull();
  });

  it.each(NON_APP_HTTP_ERRORS)(
    "returns null for %s (not an AppHttpError)",
    (_label, input) => {
      expect(getApiErrorCode(input)).toBeNull();
    }
  );
});

describe("getApiErrorMessage — fallback paths", () => {
  it.each(NON_APP_HTTP_ERRORS)(
    "returns the fallback for %s (not an AppHttpError)",
    (_label, input) => {
      expect(getApiErrorMessage(input, FALLBACK)).toBe(FALLBACK);
    }
  );

  it("returns the fallback when the AppHttpError carries no code", () => {
    expect(getApiErrorMessage(httpErrorWithoutCode(), FALLBACK)).toBe(FALLBACK);
  });

  it("returns the fallback for a code with no mapping", () => {
    expect(
      getApiErrorMessage(httpErrorWithCode("TOTALLY_UNKNOWN_CODE"), FALLBACK)
    ).toBe(FALLBACK);
  });

  it.each(["toString", "constructor", "hasOwnProperty"])(
    "returns the fallback for the inherited Object.prototype key %s (hasOwnProperty guard)",
    (code) => {
      expect(getApiErrorMessage(httpErrorWithCode(code), FALLBACK)).toBe(
        FALLBACK
      );
    }
  );
});

// Mirror the exact user-facing Spanish copy from getApiErrorMessage.ts. These
// are intentionally duplicated here (not imported) so that an accidental edit to
// the source copy trips a test and forces a deliberate update on both sides.
// "organización" in CARBON_INVENTORY_ALREADY_HAS_ORGANIZATION is interpolated
// from VOCAB.organization.noun.singular in the source.
const STATIC_MESSAGES: ReadonlyArray<readonly [string, string]> = [
  // Categories
  [
    "CATEGORY_NAME_ALREADY_EXISTS",
    "Ya existe una categoría con este nombre en esta metodología.",
  ],
  [
    "CATEGORY_POSITION_ALREADY_EXISTS",
    "Ya existe una categoría con esta posición en esta metodología.",
  ],
  [
    "METHODOLOGY_VERSION_NOT_FOUND_FOR_CATEGORY",
    "La versión de metodología no fue encontrada.",
  ],
  // Subcategories
  [
    "SUBCATEGORY_NAME_ALREADY_EXISTS",
    "Ya existe una sub-categoría con este nombre en esta categoría.",
  ],
  [
    "CATEGORY_NOT_FOUND_FOR_SUBCATEGORY",
    "La categoría asociada no fue encontrada.",
  ],
  [
    "CATEGORY_FROM_DIFFERENT_METHODOLOGY",
    "La categoría debe pertenecer a la misma metodología.",
  ],
  // Emission factors
  ["EMISSION_FACTOR_NOT_FOUND", "El factor de emisión no fue encontrado."],
  [
    "EMISSION_FACTOR_DUPLICATE",
    "Ya existe un factor de emisión con la misma sub-categoría, variables y fuente.",
  ],
  [
    "SUBCATEGORY_NOT_FOUND_FOR_EMISSION_FACTOR",
    "La sub-categoría asociada no fue encontrada.",
  ],
  [
    "RATE_MEASUREMENT_UNIT_NOT_FOUND",
    "La unidad de tasa seleccionada no fue encontrada.",
  ],
  [
    "EMISSION_FACTOR_SOURCE_CONFLICT",
    "Todos los factores de emisión activos de esta sub-categoría deben usar la misma fuente.",
  ],
  [
    "EMISSION_FACTOR_GAS_DETAILS_MISMATCH",
    "La suma del desglose GEI debe coincidir con el valor declarado.",
  ],
  // Emission factor dimensions
  ["EMISSION_FACTOR_DIMENSION_NOT_FOUND", "La dimensión no fue encontrada."],
  ["DIMENSION_NOT_CONFIGURED", "La dimensión no está configurada."],
  [
    "DIMENSION_VALUE_NOT_FOUND",
    "La variable de la dimensión no fue encontrada.",
  ],
  [
    "DIMENSION_VALUES_CANNOT_BE_REMOVED",
    "No se pueden eliminar variables de una dimensión que tiene factores de emisión activos.",
  ],
  [
    "DIMENSION_IS_REQUIRED_CHANGE_BLOCKED",
    "No se puede cambiar el campo 'requerido' porque existen factores de emisión activos para esta subcategoría.",
  ],
  [
    "DIMENSION_VALUE_NOT_FOUND_FOR_RENAME",
    "La variable a renombrar no fue encontrada.",
  ],
  ["MAX_DIMENSIONS_PER_SUBCATEGORY", "La subcategoría ya tiene 2 dimensiones."],
  [
    "DIMENSION_POSITION_ALREADY_TAKEN",
    "La posición ya está ocupada para esta subcategoría.",
  ],
  [
    "DIMENSION_MUST_HAVE_AT_LEAST_ONE_VALUE",
    "La dimensión debe tener al menos una variable.",
  ],
  [
    "DUPLICATE_DIMENSION_VALUE",
    "Ya existe una variable con ese nombre en esta dimensión.",
  ],
  [
    "DIMENSION_VALUE_NOT_FOUND_FOR_REMOVAL",
    "La variable a eliminar no fue encontrada.",
  ],
  // Reduction plan initiatives
  [
    "REDUCTION_PLAN_INITIATIVE_TITLE_ALREADY_EXISTS",
    "Ya existe una iniciativa con este título en esta sub-categoría.",
  ],
  [
    "SUBCATEGORY_NOT_FOUND_FOR_REDUCTION_PLAN_INITIATIVE",
    "La sub-categoría asociada no fue encontrada.",
  ],
  ["REDUCTION_PLAN_INITIATIVE_NOT_FOUND", "La iniciativa no fue encontrada."],
  // Methodologies
  [
    "METHODOLOGY_NAME_VERSION_ALREADY_EXISTS",
    "Ya existe una metodología con este nombre y versión.",
  ],
  [
    "METHODOLOGY_IS_PUBLISHED",
    "No se puede modificar una metodología publicada.",
  ],
  [
    "METHODOLOGY_HAS_ACTIVE_INVENTORIES",
    "No se puede eliminar la metodología porque tiene inventarios de carbono activos.",
  ],
  ["METHODOLOGY_IS_DELETED", "La metodología ya fue eliminada."],
  // Profiling catalogs (static strings only)
  [
    "SECTOR_SUBSECTOR_MISMATCH",
    "El subrubro seleccionado no pertenece al rubro indicado.",
  ],
  ["SAME_ORGANIZATION_SIZE", "No se puede reordenar un tamaño consigo mismo."],
  [
    "ORGANIZATION_SIZES_DIFFERENT_COUNTRY",
    "No se pueden reordenar tamaños de organizaciones de diferentes países.",
  ],
  ["INACTIVE_ORGANIZATION_SIZE", "Solo se pueden reordenar tamaños activos."],
  // Measurement units
  [
    "KG_MEASUREMENT_UNIT_NOT_FOUND",
    'La unidad "kg" no fue encontrada en la base de datos.',
  ],
  [
    "KG_MEASUREMENT_UNIT_IMMUTABLE",
    'La unidad "kg" es de sistema y no puede modificarse ni eliminarse.',
  ],
  [
    "BASE_UNIT_IMMUTABLE",
    "Las unidades base de magnitud no pueden modificarse ni eliminarse.",
  ],
  [
    "BASE_UNIT_TOGGLE_NOT_ALLOWED",
    "No se puede cambiar el campo 'unidad base' en una unidad existente.",
  ],
  [
    "MAGNITUDE_ALREADY_HAS_BASE_UNIT",
    "Ya existe una unidad base para esta magnitud.",
  ],
  [
    "MEASUREMENT_UNIT_ABBREVIATION_ALREADY_EXISTS",
    "Ya existe una unidad de medida con esta abreviatura.",
  ],
  [
    "MEASUREMENT_UNIT_FIELDS_LOCKED",
    "Los campos magnitud, abreviatura, factor base e indicador de base no pueden modificarse porque la unidad es base o ya tiene datos asociados.",
  ],
  [
    "MEASUREMENT_UNIT_REFERENCED",
    "No se puede eliminar esta unidad de medida porque ya tiene datos asociados.",
  ],
  ["MEASUREMENT_UNIT_NOT_FOUND", "Unidad de medida no encontrada."],
  [
    "BASE_UNIT_MUST_HAVE_BASE_FACTOR_ONE",
    "Una unidad base debe tener un factor base igual a 1.",
  ],
  [
    "BASE_FACTOR_ONE_RESERVED_FOR_BASE_UNIT",
    "Una unidad no base no puede tener factor base 1 cuando ya existe una unidad base para esta magnitud.",
  ],
  // Carbon inventory association
  [
    "CARBON_INVENTORY_ALREADY_HAS_ORGANIZATION",
    "Esta huella ya tiene una organización asociada.",
  ],
  // User role management
  ["SELF_ROLE_CHANGE", "No puedes cambiar tu propio rol."],
  ["LAST_SUPERADMIN", "Debe existir al menos un Super Administrador."],
  ["INSUFFICIENT_PERMISSIONS", "No tienes permisos para realizar esta acción."],
  ["INVALID_ROLE_TRANSITION", "La transición de rol solicitada no es válida."],
  // Authentication / identity
  [
    "EMAIL_REGISTERED_UNDER_DIFFERENT_IDENTITY",
    "Este correo ya está registrado con otra identidad. Inicia sesión con el proveedor que usaste al registrarte.",
  ],
];

describe("getApiErrorMessage — static string entries", () => {
  it.each(STATIC_MESSAGES)(
    "maps %s to its exact Spanish copy",
    (code, expected) => {
      expect(getApiErrorMessage(httpErrorWithCode(code), FALLBACK)).toBe(
        expected
      );
    }
  );
});

describe("getApiErrorMessage — DATABASE_UNIQUE_CONSTRAINT_VIOLATION", () => {
  const CODE = "DATABASE_UNIQUE_CONSTRAINT_VIOLATION";

  it.each<readonly [string, string]>([
    ["CountrySector", "Ya existe un rubro activo con ese nombre."],
    [
      "CountrySubsector",
      "Ya existe un subrubro activo con ese nombre dentro del rubro indicado.",
    ],
    [
      "OrganizationMainActivity",
      "Ya existe una actividad principal activa con ese nombre y la misma combinación de rubro/subrubro.",
    ],
    [
      "CountryOrganizationSize",
      "Ya existe un tamaño de organización activo con ese nombre.",
    ],
    ["SomethingUnknown", "Ya existe un registro con este valor."],
  ])("maps resourceType=%s", (resourceType, expected) => {
    expect(
      getApiErrorMessage(httpErrorWithCode(CODE, { resourceType }), FALLBACK)
    ).toBe(expected);
  });

  it("uses the generic message when details are absent", () => {
    expect(getApiErrorMessage(httpErrorWithCode(CODE), FALLBACK)).toBe(
      "Ya existe un registro con este valor."
    );
  });
});

describe("getApiErrorMessage — RESTORE_ON_ACTIVE", () => {
  const CODE = "RESTORE_ON_ACTIVE";

  it.each<readonly [string, string]>([
    ["CountrySector", "El rubro ya se encuentra activo."],
    ["CountrySubsector", "El subrubro ya se encuentra activo."],
    // "actividad" is feminine, so the adjective agrees as "activa" (the other
    // three subjects are masculine → "activo"). Guards the gender-agreement fix.
    [
      "OrganizationMainActivity",
      "La actividad principal ya se encuentra activa.",
    ],
    [
      "CountryOrganizationSize",
      "El tamaño de organización ya se encuentra activo.",
    ],
  ])(
    "maps known resourceType=%s to its labelled sentence",
    (resourceType, expected) => {
      expect(
        getApiErrorMessage(httpErrorWithCode(CODE, { resourceType }), FALLBACK)
      ).toBe(expected);
    }
  );

  it("falls back to the generic sentence for an unknown resourceType", () => {
    expect(
      getApiErrorMessage(
        httpErrorWithCode(CODE, { resourceType: "Nope" }),
        FALLBACK
      )
    ).toBe("El registro ya se encuentra activo.");
  });

  it("falls back to the generic sentence when details are absent", () => {
    expect(getApiErrorMessage(httpErrorWithCode(CODE), FALLBACK)).toBe(
      "El registro ya se encuentra activo."
    );
  });
});

describe("getApiErrorMessage — PARENT_NOT_ACTIVE", () => {
  const CODE = "PARENT_NOT_ACTIVE";
  const GENERIC =
    "No se puede restaurar este registro porque su entidad padre está eliminada. Restáurala primero.";

  it("composes the full sentence for a subsector under a sector", () => {
    const details = {
      resourceType: "CountrySubsector",
      parentType: "CountrySector",
      resourceName: "Transporte urbano",
      parentName: "Movilidad",
    };
    expect(getApiErrorMessage(httpErrorWithCode(CODE, details), FALLBACK)).toBe(
      'No se puede restaurar el subrubro "Transporte urbano" porque el rubro "Movilidad" está eliminado. Restáuralo primero.'
    );
  });

  it("composes the full sentence for a main activity under a subsector", () => {
    const details = {
      resourceType: "OrganizationMainActivity",
      parentType: "CountrySubsector",
      resourceName: "Reparto a domicilio",
      parentName: "Transporte urbano",
    };
    expect(getApiErrorMessage(httpErrorWithCode(CODE, details), FALLBACK)).toBe(
      'No se puede restaurar la actividad principal "Reparto a domicilio" porque el subrubro "Transporte urbano" está eliminado. Restáuralo primero.'
    );
  });

  it.each<readonly [string, Record<string, unknown>]>([
    [
      "parentName is missing",
      {
        resourceType: "CountrySubsector",
        parentType: "CountrySector",
        resourceName: "X",
      },
    ],
    [
      "resourceName is missing",
      {
        resourceType: "CountrySubsector",
        parentType: "CountrySector",
        parentName: "Y",
      },
    ],
    [
      "resourceType is unknown",
      {
        resourceType: "Nope",
        parentType: "CountrySector",
        resourceName: "X",
        parentName: "Y",
      },
    ],
    [
      "parentType is unknown",
      {
        resourceType: "CountrySector",
        parentType: "Nope",
        resourceName: "X",
        parentName: "Y",
      },
    ],
    [
      "resourceName is not a string",
      {
        resourceType: "CountrySector",
        parentType: "CountrySubsector",
        resourceName: 5,
        parentName: "Y",
      },
    ],
  ])("falls back to the generic sentence when %s", (_label, details) => {
    expect(getApiErrorMessage(httpErrorWithCode(CODE, details), FALLBACK)).toBe(
      GENERIC
    );
  });

  it("falls back to the generic sentence when details are absent", () => {
    expect(getApiErrorMessage(httpErrorWithCode(CODE), FALLBACK)).toBe(GENERIC);
  });
});

describe("getApiErrorMessage — EDIT_BLOCKED_BY_REFERENCES", () => {
  const CODE = "EDIT_BLOCKED_BY_REFERENCES";

  type EbrCase = {
    label: string;
    details: Record<string, unknown> | undefined;
    expected: string;
  };

  const CASES: readonly EbrCase[] = [
    {
      // name change · sector · single plural reference → "está en uso" not hit
      label:
        "name change on a sector referenced by plural main activities (itObj='lo')",
      details: {
        attemptedChange: "name",
        resourceType: "CountrySector",
        referencedBy: { activeMainActivities: 2 },
      },
      expected:
        "No se puede cambiar el nombre del rubro porque tiene 2 actividades principales. Si lo cambias, quienes ya lo seleccionaron verían un nombre distinto del que eligieron. Para cambiarlo, debes eliminarlo y volver a crearlo.",
    },
    {
      // name change · main activity · all four references, mixed singular/plural,
      // exercising the 4-item list join and itObj='la'
      label:
        "name change on a main activity with all four reference kinds (itObj='la')",
      details: {
        attemptedChange: "name",
        resourceType: "OrganizationMainActivity",
        referencedBy: {
          activeMainActivities: 1,
          activeSubcategoryRecommendations: 3,
          organizationData: 1,
          carbonInventories: 2,
        },
      },
      expected:
        "No se puede cambiar el nombre de la actividad principal porque tiene 1 actividad principal, 3 recomendaciones de subcategoría, 1 organización y 2 huellas de carbono. Si lo cambias, quienes ya la seleccionaron verían un nombre distinto del que eligieron. Para cambiarlo, debes eliminarla y volver a crearla.",
    },
    {
      // name change · size · no references → "está en uso"
      label:
        "name change on an organization size with no references ('está en uso')",
      details: {
        attemptedChange: "name",
        resourceType: "CountryOrganizationSize",
        referencedBy: {},
      },
      expected:
        "No se puede cambiar el nombre del tamaño de organización porque está en uso. Si lo cambias, quienes ya lo seleccionaron verían un nombre distinto del que eligieron. Para cambiarlo, debes eliminarlo y volver a crearlo.",
    },
    {
      // re-parent · subsector · single singular recommendation reference
      label:
        "re-parent on a subsector referenced by a single recommendation (non-main-activity suffix)",
      details: {
        attemptedChange: "parent",
        resourceType: "CountrySubsector",
        referencedBy: { activeSubcategoryRecommendations: 1 },
      },
      expected:
        "No se puede cambiar el rubro del subrubro porque tiene 1 recomendación de subcategoría. Para reasignarlo, elimínalo y vuelve a crearlo con el rubro correcto.",
    },
    {
      // re-parent · main activity · two references → 2-item list join, main-activity suffix
      label:
        "re-parent on a main activity with two singular references (main-activity suffix)",
      details: {
        resourceType: "OrganizationMainActivity",
        referencedBy: { organizationData: 1, carbonInventories: 1 },
      },
      expected:
        "No se puede cambiar el rubro o subrubro de la actividad principal porque tiene 1 organización y 1 huella de carbono. Para reasignarla, elimínala y vuelve a crearla con el rubro o subrubro correcto.",
    },
    {
      // re-parent · unknown resourceType → "del registro"; non-numeric count ignored
      label:
        "re-parent on an unknown resource ('del registro'); a non-numeric count is ignored",
      details: {
        referencedBy: { organizationData: 2, activeMainActivities: "5" },
      },
      expected:
        "No se puede cambiar el rubro del registro porque tiene 2 organizaciones. Para reasignarlo, elimínalo y vuelve a crearlo con el rubro correcto.",
    },
    {
      // re-parent · details entirely absent → apiDetails undefined, "está en uso", "del registro"
      label: "re-parent with no details at all (apiDetails undefined)",
      details: undefined,
      expected:
        "No se puede cambiar el rubro del registro porque está en uso. Para reasignarlo, elimínalo y vuelve a crearlo con el rubro correcto.",
    },
  ];

  it.each(CASES)("$label", ({ details, expected }) => {
    expect(getApiErrorMessage(httpErrorWithCode(CODE, details), FALLBACK)).toBe(
      expected
    );
  });
});

describe("getApiErrorMessageFromCode", () => {
  it.each(STATIC_MESSAGES)(
    "resolves the string entry for %s from the code alone",
    (code, expected) => {
      expect(getApiErrorMessageFromCode(code, FALLBACK)).toBe(expected);
    }
  );

  it.each([
    "DATABASE_UNIQUE_CONSTRAINT_VIOLATION",
    "EDIT_BLOCKED_BY_REFERENCES",
    "RESTORE_ON_ACTIVE",
    "PARENT_NOT_ACTIVE",
  ])(
    "falls back for the details-dependent (function) entry %s (no details to feed it)",
    (code) => {
      expect(getApiErrorMessageFromCode(code, FALLBACK)).toBe(FALLBACK);
    }
  );

  it("falls back for an undefined code", () => {
    expect(getApiErrorMessageFromCode(undefined, FALLBACK)).toBe(FALLBACK);
  });

  it("falls back for an unmapped code", () => {
    expect(getApiErrorMessageFromCode("TOTALLY_UNKNOWN_CODE", FALLBACK)).toBe(
      FALLBACK
    );
  });

  it.each(["toString", "constructor", "hasOwnProperty"])(
    "falls back for the inherited Object.prototype key %s (hasOwnProperty guard)",
    (code) => {
      expect(getApiErrorMessageFromCode(code, FALLBACK)).toBe(FALLBACK);
    }
  );
});
