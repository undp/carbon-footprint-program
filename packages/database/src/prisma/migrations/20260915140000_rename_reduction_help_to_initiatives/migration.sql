-- Rename the reduction help panels from "plan" to "iniciativas" on databases
-- that were already seeded, and give the empty one real content.
--
-- The seed cannot do this. seedStandaloneExplanations upserts, so it would
-- happily update these rows -- but seed.ts aborts the whole run before reaching
-- it when the database already contains data (the country-count gate), so an
-- installed deployment keeps serving the text it was seeded with.
--
-- Why: the interface now calls the section "Iniciativas de reducción", because
-- what it lists are individual suggestions an organization adopts one or two
-- of, not a plan it has committed to. The help panel behind the (i) still
-- opened with the old heading, and its description quoted the very section
-- title that changed. The `reduction-plan` panel also held nothing but that
-- heading, so it now carries the paragraph that makes the distinction the
-- rename is about.
--
-- UNLIKE the methodology-content migrations, `explanation` has no country
-- column: these are app-level help texts, one row per slug for the whole
-- install, so this is NOT scoped to the demo country and every deployment
-- receives it -- which is the intent, since the interface changed everywhere.
--
-- Each write is guarded on the PREVIOUS seeded value instead of on
-- IS DISTINCT FROM. A deployment that rewrote one of these panels keeps its own
-- text rather than having it silently replaced, and the guard doubles as the
-- idempotency check: once applied, the old value no longer matches and a
-- re-run touches zero rows.
--
-- Help text only: no factor, no methodology, no captured inventory line and no
-- computed total is touched here.

-- reduction-plan
WITH nv AS (SELECT $md$# Iniciativas de reducción

Esta sección reúne las **iniciativas de reducción sugeridas** para tu huella, agrupadas por categoría de emisión. Se generan a partir de las fuentes que declaraste: donde más emitiste, más sugerencias verás.

> ⚠️ **No es un plan de reducción.** Un plan es el conjunto de acciones que tu organización decide comprometer, con metas y plazos propios. Lo que ves acá son **opciones** entre las que elegir: es normal adoptar una o dos y descartar el resto.

Cada iniciativa describe una acción concreta. Para llevar una al terreno y hacerle seguimiento con datos base, metas y gases considerados, créala como **Proyecto de reducción**.

💡 El catálogo de iniciativas lo define cada país. Si echas de menos una acción relevante para tu sector, coméntaselo al programa nacional.
$md$::text AS "content")
UPDATE "explanation" e
SET "content" = nv."content", "name" = $s$Iniciativas de reducción$s$, "description" = $s$Texto de ayuda mostrado en la sección 'Iniciativas de reducción por categoría'.$s$
FROM nv
WHERE e."slug" = $s$reduction-plan$s$
  AND 
e."content" = $old$# Plan de reducción
$old$  AND e."name" = $s$Plan de reducción$s$;

-- reduction-plan-initiatives-maintainer
WITH nv AS (SELECT $md$# Mantenedor de Iniciativas para Planes de Reducción

## Objetivo

Esta pantalla administra el catálogo de Iniciativas tipo que las organizaciones pueden seleccionar al elegir sus iniciativas de reducción de emisiones (por ejemplo, cambio a iluminación LED, electrificación de flota, mejora de eficiencia térmica, sustitución de combustibles, recambio de equipos refrigerantes, entre otras).

Cada Iniciativa está asociada a una Sub-categoría dentro de una versión de Metodología, lo que permite ofrecer a las organizaciones un set de iniciativas pertinentes al ámbito de emisiones que están trabajando. Las organizaciones eligen iniciativas desde este catálogo al construir su plan; los planes ya guardados referencian la iniciativa por identificador.

## Alcance

- Permite gestionar Iniciativas con las siguientes columnas: Subcategoría asociada, nombre y descripción.
- Las Iniciativas existen siempre en el contexto de una versión de Metodología, que se selecciona en el encabezado. Por defecto se muestra la Metodología publicada.
- Las Sub-categorías disponibles provienen del Mantenedor de Sub-categorías de la Metodología seleccionada y se muestran agrupadas por Categoría.
- No se administra desde aquí la asignación concreta de iniciativas a organizaciones, ni los planes de reducción específicos de cada inventario.

## Acciones disponibles

### Crear Iniciativa

1. Seleccionar la Metodología sobre la que se desea trabajar en el selector del encabezado.
2. Hacer clic en "Agregar fila". La nueva fila aparece al inicio de la tabla en modo edición.
3. Completar los campos requeridos y confirmar.

Campos y validaciones:

| Columna      | Reglas                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------- |
| Subcategoría | Obligatoria. Debe pertenecer a la Metodología seleccionada. Se elige agrupada por Categoría. |
| Nombre       | Obligatorio. Entre 1 y 120 caracteres. Debe ser único dentro de una misma Sub-categoría.     |
| Descripción  | Obligatoria. Entre 1 y 1000 caracteres.                                                      |

### Editar Iniciativa

Hacer clic sobre la fila para entrar en modo edición y modificar los campos editables. Cambiar la Sub-categoría desplaza la iniciativa a otro ámbito de cálculo, lo que altera el set de organizaciones para las que aparece como sugerencia.

### Eliminar Iniciativa

La operación se realiza como eliminación lógica: la Iniciativa queda marcada como eliminada y deja de mostrarse como opción en nuevos planes. Los planes ya guardados que la referencian conservan el vínculo.

### Cambiar Metodología en uso

El selector de Metodología en el encabezado permite alternar entre versiones. Si hay cambios sin guardar al cambiar de Metodología, el sistema solicita confirmación para descartarlos antes de continuar.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Los planes de reducción ya creados por organizaciones referencian las iniciativas por identificador. Renombrar el título o reescribir la descripción de una Iniciativa altera lo que ven las organizaciones que ya la habían seleccionado. Eliminar una Iniciativa la retira del catálogo, pero los planes históricos conservan el vínculo y deben revisarse caso a caso si fuese necesario actualizarlos.

> ℹ️ **Cuándo modificar**
> Lo habitual es agregar nuevas iniciativas a medida que aparecen tecnologías o prácticas relevantes en el contexto del país, o cuando se incorpora una nueva versión de Metodología que abre Sub-categorías no cubiertas. También es útil corregir descripciones poco claras detectadas en uso real.

> 🚫 **Cuándo NO modificar**
> No se recomienda eliminar Iniciativas ampliamente utilizadas por organizaciones en planes vigentes. Tampoco cambiar la Sub-categoría asociada a una Iniciativa en uso, ya que altera el ámbito de cálculo asociado a la decisión que tomaron las organizaciones cuando la seleccionaron.
$md$::text AS "content")
UPDATE "explanation" e
SET "content" = nv."content", "name" = $s$Mantenedor de iniciativas de reducción$s$, "description" = $s$Texto de ayuda mostrado en el mantenedor del catálogo de iniciativas de reducción.$s$
FROM nv
WHERE e."slug" = $s$reduction-plan-initiatives-maintainer$s$
  AND 
e."content" = $old$# Mantenedor de Iniciativas para Planes de Reducción

## Objetivo

Esta pantalla administra el catálogo de Iniciativas tipo que las organizaciones pueden seleccionar al armar su Plan de Reducción de emisiones (por ejemplo, cambio a iluminación LED, electrificación de flota, mejora de eficiencia térmica, sustitución de combustibles, recambio de equipos refrigerantes, entre otras).

Cada Iniciativa está asociada a una Sub-categoría dentro de una versión de Metodología, lo que permite ofrecer a las organizaciones un set de iniciativas pertinentes al ámbito de emisiones que están trabajando. Las organizaciones eligen iniciativas desde este catálogo al construir su plan; los planes ya guardados referencian la iniciativa por identificador.

## Alcance

- Permite gestionar Iniciativas con las siguientes columnas: Subcategoría asociada, nombre y descripción.
- Las Iniciativas existen siempre en el contexto de una versión de Metodología, que se selecciona en el encabezado. Por defecto se muestra la Metodología publicada.
- Las Sub-categorías disponibles provienen del Mantenedor de Sub-categorías de la Metodología seleccionada y se muestran agrupadas por Categoría.
- No se administra desde aquí la asignación concreta de iniciativas a organizaciones, ni los planes de reducción específicos de cada inventario.

## Acciones disponibles

### Crear Iniciativa

1. Seleccionar la Metodología sobre la que se desea trabajar en el selector del encabezado.
2. Hacer clic en "Agregar fila". La nueva fila aparece al inicio de la tabla en modo edición.
3. Completar los campos requeridos y confirmar.

Campos y validaciones:

| Columna      | Reglas                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------- |
| Subcategoría | Obligatoria. Debe pertenecer a la Metodología seleccionada. Se elige agrupada por Categoría. |
| Nombre       | Obligatorio. Entre 1 y 120 caracteres. Debe ser único dentro de una misma Sub-categoría.     |
| Descripción  | Obligatoria. Entre 1 y 1000 caracteres.                                                      |

### Editar Iniciativa

Hacer clic sobre la fila para entrar en modo edición y modificar los campos editables. Cambiar la Sub-categoría desplaza la iniciativa a otro ámbito de cálculo, lo que altera el set de organizaciones para las que aparece como sugerencia.

### Eliminar Iniciativa

La operación se realiza como eliminación lógica: la Iniciativa queda marcada como eliminada y deja de mostrarse como opción en nuevos planes. Los planes ya guardados que la referencian conservan el vínculo.

### Cambiar Metodología en uso

El selector de Metodología en el encabezado permite alternar entre versiones. Si hay cambios sin guardar al cambiar de Metodología, el sistema solicita confirmación para descartarlos antes de continuar.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Los planes de reducción ya creados por organizaciones referencian las iniciativas por identificador. Renombrar el título o reescribir la descripción de una Iniciativa altera lo que ven las organizaciones que ya la habían seleccionado. Eliminar una Iniciativa la retira del catálogo, pero los planes históricos conservan el vínculo y deben revisarse caso a caso si fuese necesario actualizarlos.

> ℹ️ **Cuándo modificar**
> Lo habitual es agregar nuevas iniciativas a medida que aparecen tecnologías o prácticas relevantes en el contexto del país, o cuando se incorpora una nueva versión de Metodología que abre Sub-categorías no cubiertas. También es útil corregir descripciones poco claras detectadas en uso real.

> 🚫 **Cuándo NO modificar**
> No se recomienda eliminar Iniciativas ampliamente utilizadas por organizaciones en planes vigentes. Tampoco cambiar la Sub-categoría asociada a una Iniciativa en uso, ya que altera el ámbito de cálculo asociado a la decisión que tomaron las organizaciones cuando la seleccionaron.
$old$  AND e."name" = $s$Mantenedor de iniciativas de plan de reducción$s$;

-- subcategories-maintainer
WITH nv AS (SELECT $md$# Mantenedor de Sub-categorías

## Objetivo

Esta pantalla administra el catálogo de Sub-categorías asociadas a las Categorías de una versión de Metodología. Las Sub-categorías son el nivel sobre el cual se levantan las líneas de inventario, se asocian Factores de Emisión y se ofrecen recomendaciones de captura por sector, por lo que constituyen una pieza central de la operación del sistema.

Cada Sub-categoría se enmarca dentro de una Categoría y declara las Unidades de Medida válidas para registrar consumos o actividad. La pantalla opera en el contexto de la versión de Metodología seleccionada en el encabezado y permite editar el conjunto completo de manera tabular.

## Alcance

- Permite gestionar Sub-categorías con las siguientes columnas: ícono, Categoría / Alcance a la que pertenecen, sub-categoría (nombre), descripción, unidades aceptadas y explicación extendida (texto enriquecido opcional).
- Las Sub-categorías pertenecen a una Categoría administrada en el Mantenedor de Categorías. Si una Categoría requerida no existe, debe crearse previamente en ese mantenedor.
- Las Unidades de Medida disponibles para asociar provienen del Mantenedor de Unidades de Medida.
- Los Factores de Emisión, Dimensiones y Recomendaciones de Sub-categoría se administran en sus propias pantallas; no se gestionan desde aquí.

## Acciones disponibles

### Crear Sub-categoría

1. Hacer clic en "Agregar fila" en el encabezado. La nueva fila aparece al inicio de la tabla en modo edición.
2. Completar los campos requeridos y guardar la fila.

Campos y validaciones:

| Columna             | Reglas                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Ícono               | Obligatorio. Debe corresponder a un ícono válido del catálogo; toma el color de la Categoría. |
| Categoría / Alcance | Obligatoria. Debe seleccionarse una Categoría existente de la metodología actual.             |
| Sub-categoría       | Obligatorio. Entre 1 y 255 caracteres. Debe ser único dentro de la Categoría.                 |
| Descripción         | Obligatoria. Texto breve que describe la sub-categoría.                                       |
| Unidades aceptadas  | Lista de Unidades de Medida válidas para esta sub-categoría. No se admiten duplicados.        |
| Explicación         | Opcional. Texto enriquecido extendido gestionado desde el editor asociado a la fila.          |

### Editar Sub-categoría

1. Hacer clic sobre la fila para entrar en modo edición.
2. Modificar los campos editables y confirmar los cambios desde los controles de la fila.

Son editables el ícono, la Categoría / Alcance a la que pertenece, la sub-categoría (nombre), la descripción, las unidades aceptadas y la explicación. El identificador interno no se modifica desde esta pantalla.

### Eliminar Sub-categoría

1. Usar la acción de eliminar en la fila correspondiente.
2. La operación se realiza como eliminación lógica: la sub-categoría queda marcada como eliminada y deja de mostrarse en los listados activos.

Antes de eliminar conviene revisar la sección "Consideraciones": la Sub-categoría puede tener Factores de Emisión, Dimensiones, recomendaciones por sector y líneas de inventarios históricos vinculadas.

### Editar explicación extendida

Cada fila expone un acceso a un editor de explicación enriquecida (markdown). El contenido se guarda asociado a la Sub-categoría y se utiliza para entregar contexto adicional en pantallas de captura y consulta.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Las Sub-categorías son referenciadas por Factores de Emisión, Dimensiones de Factor de Emisión, Líneas de Inventario, Iniciativas de reducción, Proyectos de Reducción y Recomendaciones por sector. Eliminar una Sub-categoría puede orfanear Factores de Emisión y dejar datos de inventarios históricos sin referencia activa visible. Cambiar la Categoría asociada o el nombre afecta cómo se agrupan y reportan datos ya capturados.

> ℹ️ **Cuándo modificar**
> Es apropiado intervenir este mantenedor durante el onboarding de la metodología, al incorporar nuevas fuentes de emisión derivadas de la normativa del país, o cuando se requiere ajustar la lista de Unidades de Medida válidas para una sub-categoría existente.

> 🚫 **Cuándo NO modificar**
> No eliminar ni renombrar Sub-categorías que ya hayan sido utilizadas en inventarios reportados, reconocimientos emitidos o reportes públicos. Para cambios estructurales de fondo, se sugiere generar una nueva versión de la Metodología en lugar de modificar la actual.
$md$::text AS "content")
UPDATE "explanation" e
SET "content" = nv."content"
FROM nv
WHERE e."slug" = $s$subcategories-maintainer$s$
  AND 
e."content" = $old$# Mantenedor de Sub-categorías

## Objetivo

Esta pantalla administra el catálogo de Sub-categorías asociadas a las Categorías de una versión de Metodología. Las Sub-categorías son el nivel sobre el cual se levantan las líneas de inventario, se asocian Factores de Emisión y se ofrecen recomendaciones de captura por sector, por lo que constituyen una pieza central de la operación del sistema.

Cada Sub-categoría se enmarca dentro de una Categoría y declara las Unidades de Medida válidas para registrar consumos o actividad. La pantalla opera en el contexto de la versión de Metodología seleccionada en el encabezado y permite editar el conjunto completo de manera tabular.

## Alcance

- Permite gestionar Sub-categorías con las siguientes columnas: ícono, Categoría / Alcance a la que pertenecen, sub-categoría (nombre), descripción, unidades aceptadas y explicación extendida (texto enriquecido opcional).
- Las Sub-categorías pertenecen a una Categoría administrada en el Mantenedor de Categorías. Si una Categoría requerida no existe, debe crearse previamente en ese mantenedor.
- Las Unidades de Medida disponibles para asociar provienen del Mantenedor de Unidades de Medida.
- Los Factores de Emisión, Dimensiones y Recomendaciones de Sub-categoría se administran en sus propias pantallas; no se gestionan desde aquí.

## Acciones disponibles

### Crear Sub-categoría

1. Hacer clic en "Agregar fila" en el encabezado. La nueva fila aparece al inicio de la tabla en modo edición.
2. Completar los campos requeridos y guardar la fila.

Campos y validaciones:

| Columna             | Reglas                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Ícono               | Obligatorio. Debe corresponder a un ícono válido del catálogo; toma el color de la Categoría. |
| Categoría / Alcance | Obligatoria. Debe seleccionarse una Categoría existente de la metodología actual.             |
| Sub-categoría       | Obligatorio. Entre 1 y 255 caracteres. Debe ser único dentro de la Categoría.                 |
| Descripción         | Obligatoria. Texto breve que describe la sub-categoría.                                       |
| Unidades aceptadas  | Lista de Unidades de Medida válidas para esta sub-categoría. No se admiten duplicados.        |
| Explicación         | Opcional. Texto enriquecido extendido gestionado desde el editor asociado a la fila.          |

### Editar Sub-categoría

1. Hacer clic sobre la fila para entrar en modo edición.
2. Modificar los campos editables y confirmar los cambios desde los controles de la fila.

Son editables el ícono, la Categoría / Alcance a la que pertenece, la sub-categoría (nombre), la descripción, las unidades aceptadas y la explicación. El identificador interno no se modifica desde esta pantalla.

### Eliminar Sub-categoría

1. Usar la acción de eliminar en la fila correspondiente.
2. La operación se realiza como eliminación lógica: la sub-categoría queda marcada como eliminada y deja de mostrarse en los listados activos.

Antes de eliminar conviene revisar la sección "Consideraciones": la Sub-categoría puede tener Factores de Emisión, Dimensiones, recomendaciones por sector y líneas de inventarios históricos vinculadas.

### Editar explicación extendida

Cada fila expone un acceso a un editor de explicación enriquecida (markdown). El contenido se guarda asociado a la Sub-categoría y se utiliza para entregar contexto adicional en pantallas de captura y consulta.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Las Sub-categorías son referenciadas por Factores de Emisión, Dimensiones de Factor de Emisión, Líneas de Inventario, iniciativas del Plan de Reducción, Proyectos de Reducción y Recomendaciones por sector. Eliminar una Sub-categoría puede orfanear Factores de Emisión y dejar datos de inventarios históricos sin referencia activa visible. Cambiar la Categoría asociada o el nombre afecta cómo se agrupan y reportan datos ya capturados.

> ℹ️ **Cuándo modificar**
> Es apropiado intervenir este mantenedor durante el onboarding de la metodología, al incorporar nuevas fuentes de emisión derivadas de la normativa del país, o cuando se requiere ajustar la lista de Unidades de Medida válidas para una sub-categoría existente.

> 🚫 **Cuándo NO modificar**
> No eliminar ni renombrar Sub-categorías que ya hayan sido utilizadas en inventarios reportados, reconocimientos emitidos o reportes públicos. Para cambios estructurales de fondo, se sugiere generar una nueva versión de la Metodología en lugar de modificar la actual.
$old$;
