-- Add the Año row and the per-year source rule to the emission-factor maintainer
-- help panel on databases that were already seeded.
--
-- The seed cannot do this. seedStandaloneExplanations upserts, so it would
-- happily update this row -- but seed.ts aborts the whole run before reaching
-- it when the database already contains data (the country-count gate), so an
-- installed deployment keeps serving the text it was seeded with. Same reason
-- as 20260915140000_rename_reduction_help_to_initiatives, same shape.
--
-- Why: the year is now a required field of every emission factor, and the
-- source consistency rule it changed is stated per year. Without this, the (i)
-- of the very screen this change reworks keeps describing a form that no longer
-- exists -- an Año column the administrator has to fill with no explanation of
-- what it means, and a source rule that reads as subcategory-wide when it is
-- now scoped to a year.
--
-- UNLIKE the methodology-content migrations, `explanation` has no country
-- column: these are app-level help texts, one row per slug for the whole
-- install, so this is NOT scoped to the demo country and every deployment
-- receives it -- which is the intent, since the maintainer changed everywhere.
--
-- The write is guarded on the PREVIOUS seeded value instead of on
-- IS DISTINCT FROM. A deployment that rewrote this panel keeps its own text
-- rather than having it silently replaced, and the guard doubles as the
-- idempotency check: once applied, the old value no longer matches and a
-- re-run touches zero rows.
--
-- Help text only: no factor, no methodology, no captured inventory line and no
-- computed total is touched here.

-- emission-factors-maintainer
WITH nv AS (SELECT $md$# Mantenedor de Factores de Emisión

## Objetivo

Esta pantalla administra el catálogo de Factores de Emisión asociados a una versión de Metodología. Un Factor de Emisión es el valor numérico que convierte una unidad de actividad (combustible quemado, energía consumida, distancia recorrida, kilogramos de residuos, etc.) en una cantidad equivalente de CO₂eq, y constituye la pieza central del cálculo de huella de carbono.

Cada Factor está asociado a una Sub-categoría, una Unidad de Medida de tasa, una fuente bibliográfica o regulatoria y un desglose por GEI (CO₂ fósil, CH₄, N₂O, HFC, PFC, SF₆, NF₃). Cuando la Sub-categoría lo requiere, también se asocia a valores de Dimensiones que afinan el factor según el contexto (por ejemplo, tipo de combustible, mix energético, región).

## Alcance

- Permite gestionar Factores de Emisión con las siguientes columnas: Sub-categoría, Variable 1 y Variable 2 (cuando la Sub-categoría las requiere), Valor, Unidad, Desglose GEI y Fuente.
- Los Factores existen siempre dentro del contexto de una versión de Metodología, que se selecciona en el encabezado.
- Las opciones de Sub-categoría, Unidad de Medida y valores de Dimensión provienen de los mantenedores correspondientes (Sub-categorías, Unidades de Medida de Tasa, Dimensiones de Factores de Emisión).
- No se administra desde aquí la definición de Sub-categorías, Dimensiones ni Unidades de Medida; sólo la asociación de valores numéricos.

## Acciones disponibles

### Crear Factor de Emisión

1. Hacer clic en "Agregar fila" en el encabezado. La nueva fila aparece al inicio de la tabla en modo edición.
2. Completar los campos requeridos y confirmar.

Campos y validaciones:

| Columna       | Reglas                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sub-categoría | Obligatoria. Debe pertenecer a la Metodología activa en el selector.                                                                                                                       |
| Variable 1    | Obligatoria si la Sub-categoría declara una primera dimensión requerida; deshabilitada (no aplica) en otro caso.                                                                           |
| Variable 2    | Obligatoria si la Sub-categoría declara una segunda dimensión requerida; deshabilitada (no aplica) en otro caso.                                                                           |
| Valor         | Obligatorio. Número no negativo y distinto de 0.                                                                                                                                           |
| Unidad        | Obligatoria. Debe corresponder a una unidad de tasa compatible con la Sub-categoría.                                                                                                       |
| Desglose GEI  | Valores no negativos por gas (CO₂ fósil, CH₄, N₂O, HFC, PFC, SF₆, NF₃). Se edita en un modal.                                                                                              |
| Fuente        | Obligatoria. Texto libre con la referencia bibliográfica o regulatoria del factor. Todos los Factores activos de una misma Sub-categoría deben compartir la Fuente dentro de un mismo Año. |
| Año           | Obligatorio. Año de huella para el que el Factor es válido. El selector ofrece desde cuatro años atrás hasta el próximo. Una huella sólo recibe Factores de su mismo año.                  |

### Editar Factor de Emisión

Hacer clic sobre la fila para entrar en modo edición y modificar los campos editables. El desglose por GEI se edita en un modal dedicado al que se accede desde la propia fila.

### Eliminar Factor de Emisión

La operación se realiza como eliminación lógica: el Factor queda marcado como eliminado y deja de mostrarse en los listados activos. Las líneas de inventarios históricos que ya referencian este Factor conservan el vínculo a través de su factor congelado por línea.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Los Factores de Emisión son la base del cálculo de huella. Modificar el valor o el desglose por GEI de un Factor existente afecta inmediatamente los cálculos de inventarios en captura. Los inventarios cerrados y reconocidos preservan los valores con los que fueron calculados, pero los inventarios activos se recalcularán al recargar. Cambiar la Sub-categoría o las Dimensiones asociadas a un Factor puede dejar líneas históricas referenciando una configuración inconsistente.

> ℹ️ **Cuándo modificar**
> Lo habitual es agregar Factores nuevos cuando el regulador del país publica actualizaciones de los factores oficiales, cuando se incorpora una nueva fuente bibliográfica o cuando una nueva versión de Metodología requiere ampliar la cobertura.

> 🚫 **Cuándo NO modificar**
> No se recomienda alterar el valor, fuente o GEI de Factores que ya hayan sido utilizados en inventarios reportados o reconocidos: en ese caso conviene crear una nueva versión de la Metodología (vía duplicación) y aplicar allí los nuevos valores, dejando intacta la versión histórica.
$md$::text AS "content")
UPDATE "explanation" e
SET "content" = nv."content"
FROM nv
WHERE e."slug" = $s$emission-factors-maintainer$s$
  AND 
e."content" = $old$# Mantenedor de Factores de Emisión

## Objetivo

Esta pantalla administra el catálogo de Factores de Emisión asociados a una versión de Metodología. Un Factor de Emisión es el valor numérico que convierte una unidad de actividad (combustible quemado, energía consumida, distancia recorrida, kilogramos de residuos, etc.) en una cantidad equivalente de CO₂eq, y constituye la pieza central del cálculo de huella de carbono.

Cada Factor está asociado a una Sub-categoría, una Unidad de Medida de tasa, una fuente bibliográfica o regulatoria y un desglose por GEI (CO₂ fósil, CH₄, N₂O, HFC, PFC, SF₆, NF₃). Cuando la Sub-categoría lo requiere, también se asocia a valores de Dimensiones que afinan el factor según el contexto (por ejemplo, tipo de combustible, mix energético, región).

## Alcance

- Permite gestionar Factores de Emisión con las siguientes columnas: Sub-categoría, Variable 1 y Variable 2 (cuando la Sub-categoría las requiere), Valor, Unidad, Desglose GEI y Fuente.
- Los Factores existen siempre dentro del contexto de una versión de Metodología, que se selecciona en el encabezado.
- Las opciones de Sub-categoría, Unidad de Medida y valores de Dimensión provienen de los mantenedores correspondientes (Sub-categorías, Unidades de Medida de Tasa, Dimensiones de Factores de Emisión).
- No se administra desde aquí la definición de Sub-categorías, Dimensiones ni Unidades de Medida; sólo la asociación de valores numéricos.

## Acciones disponibles

### Crear Factor de Emisión

1. Hacer clic en "Agregar fila" en el encabezado. La nueva fila aparece al inicio de la tabla en modo edición.
2. Completar los campos requeridos y confirmar.

Campos y validaciones:

| Columna       | Reglas                                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| Sub-categoría | Obligatoria. Debe pertenecer a la Metodología activa en el selector.                                             |
| Variable 1    | Obligatoria si la Sub-categoría declara una primera dimensión requerida; deshabilitada (no aplica) en otro caso. |
| Variable 2    | Obligatoria si la Sub-categoría declara una segunda dimensión requerida; deshabilitada (no aplica) en otro caso. |
| Valor         | Obligatorio. Número no negativo y distinto de 0.                                                                 |
| Unidad        | Obligatoria. Debe corresponder a una unidad de tasa compatible con la Sub-categoría.                             |
| Desglose GEI  | Valores no negativos por gas (CO₂ fósil, CH₄, N₂O, HFC, PFC, SF₆, NF₃). Se edita en un modal.                    |
| Fuente        | Obligatoria. Texto libre con la referencia bibliográfica o regulatoria del factor.                               |

### Editar Factor de Emisión

Hacer clic sobre la fila para entrar en modo edición y modificar los campos editables. El desglose por GEI se edita en un modal dedicado al que se accede desde la propia fila.

### Eliminar Factor de Emisión

La operación se realiza como eliminación lógica: el Factor queda marcado como eliminado y deja de mostrarse en los listados activos. Las líneas de inventarios históricos que ya referencian este Factor conservan el vínculo a través de su factor congelado por línea.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Los Factores de Emisión son la base del cálculo de huella. Modificar el valor o el desglose por GEI de un Factor existente afecta inmediatamente los cálculos de inventarios en captura. Los inventarios cerrados y reconocidos preservan los valores con los que fueron calculados, pero los inventarios activos se recalcularán al recargar. Cambiar la Sub-categoría o las Dimensiones asociadas a un Factor puede dejar líneas históricas referenciando una configuración inconsistente.

> ℹ️ **Cuándo modificar**
> Lo habitual es agregar Factores nuevos cuando el regulador del país publica actualizaciones de los factores oficiales, cuando se incorpora una nueva fuente bibliográfica o cuando una nueva versión de Metodología requiere ampliar la cobertura.

> 🚫 **Cuándo NO modificar**
> No se recomienda alterar el valor, fuente o GEI de Factores que ya hayan sido utilizados en inventarios reportados o reconocidos: en ese caso conviene crear una nueva versión de la Metodología (vía duplicación) y aplicar allí los nuevos valores, dejando intacta la versión histórica.
$old$;
