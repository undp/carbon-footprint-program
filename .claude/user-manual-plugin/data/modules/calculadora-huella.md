# Calculadora de huella (asistente de cálculo)

- **slug:** calculadora-huella
- **fuente:** ambas
- **estado:** explorado
- **acceso:** anónimo (borrador vía header `x-carbon-inventory-uuid`) → se "reclama" tras iniciar sesión

## Propósito

Asistente guiado de 5 pasos para calcular la huella de carbono de una organización. Se
puede iniciar sin cuenta (borrador anónimo) y luego reclamarlo al registrarse. Es también
el flujo de edición de un inventario existente. Relacionado con [[huella-organizacional]].

## Rutas

- `/carbon-inventory` — layout; `/carbon-inventory/` redirige a `/app/carbon-inventories`
- `/carbon-inventory/$id/business-profiling` — Paso 1 Perfilamiento
- `/carbon-inventory/$id/subcategory-preselection` — Paso 2 Fuentes/actividades
- `/carbon-inventory/$id/emission-capture` — Paso 3 Captura de datos
- `/carbon-inventory/$id/emission-summary` — Paso 4 Resumen
- `/carbon-inventory/$id/emission-results` — Paso 5 Resultados
- `/carbon-inventory/$id/claim` — asocia el borrador anónimo al usuario recién autenticado

## Pantallas / vistas

1. **Perfilamiento** — año, nombre del borrador, organización (opcional), tamaño, rubro, sub-rubro, actividad principal; caja de ayuda contextual.
2. **Preselección de subcategorías** — fuentes/actividades sugeridas por rubro; modal "Agregar subcategoría".
3. **Captura de emisiones** — grilla EmissionEditor; por línea: subir/ver/borrar archivos de evidencia, comentarios, agregar/quitar líneas.
4. **Resumen** — tabla de factores, desglose GEI, atributos del inventario, descarga.
5. **Resultados** — resultado calculado; en flujo invitado, modal para registrarse y guardar el borrador.

## Acciones principales

- Perfilar, preseleccionar fuentes, capturar actividad, calcular, ver resultados.
- Subir archivos de evidencia por línea; comentar líneas.
- Guardar borrador / registrarse (flujo invitado) → reclamar borrador.
- Modo `SIMPLIFIED` vs `EXPERT` (a nivel inventario); `inputType` por línea `SIMPLIFIED|EXPERT|DIRECT`.

## Entidades

- `CarbonInventory` (`usageMode`, `isSelfDeclared`) → `CarbonInventoryLine` → `CarbonInventoryLineInput` / `CarbonInventoryLineFactor` / `CarbonInventoryLineResult`; `CarbonInventoryLineFile`.
- Vistas de subtotales: `CarbonInventorySubtotalsView`, `CarbonInventorySectorSubtotalsView`.

## Estados / badges

- `InventoryStatus` (`schema.prisma:699`) + `CarbonInventoryDisplayStatus` (derivado, `packages/types/src/carbonInventories/schemas.ts:32`): DRAFT → SELF_DECLARED | SUBMITTED_TO_CALCULATION → CALCULATION_REVIEWED|REJECTED|APPROVED → SUBMITTED_TO_VERIFICATION → …
- `CarbonInventoryLineStatus` incluye `OUTDATED`.

## Referencias de código

- `apps/web/src/routes/carbon-inventory/$inventoryId/*.tsx` (business-profiling:7, subcategory-preselection:7, emission-capture:7, emission-summary:7, emission-results:7, claim:82)
- Pantallas: `apps/web/src/screens/CarbonInventory/*` (`BusinessProfilingScreen.tsx:226`, `SubcategoryPreselectionScreen.tsx:205`, `EmissionCaptureScreen.tsx:341`, `EmissionSummaryScreen.tsx:169`, `EmissionResultsScreen.tsx:101`)
- Guard servidor: `useCarbonInventoryRouteGuard.ts:12-37`; API `carbonInventoryAuthorizationPlugin.ts:96-288` (header UUID 184-203)
- keys: `apps/web/src/api/query/carbonInventories/keys.ts:5-156`

## Evidencia

- **código:** rutas de los 5 pasos + claim, pantallas, guard.
- **navegación:** Paso 1 (Perfilamiento) recorrido en vivo desde el landing público; pasos siguientes por código (requieren avanzar el flujo).

## Dudas abiertas

- Para el manual conviene capturar los 5 pasos con datos de ejemplo (rubro representativo). Ver [[feedback_rhf_setvalue_resetfield_lines]] al documentar la grilla de captura.
- Confirmar diferencias visibles entre modo SIMPLIFIED y EXPERT en la captura.
