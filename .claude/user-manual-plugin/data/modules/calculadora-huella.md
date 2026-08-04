# Calculadora de huella (asistente de cálculo)

- **slug:** calculadora-huella
- **fuente:** ambas
- **estado:** verificado
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
  El modo se elige **al crear** el inventario, no se cambia después: "Quiero calcular mi huella" /
  "Usar calculadora" → `SIMPLIFIED`; "Ya tengo mis cálculos" / "Subir emisiones" → `EXPERT`. Mismos
  dos pares en el landing público (`CreateInventoryOptions.tsx:12-27`) y en el diálogo con sesión
  (`NewInventoryDialog.tsx:120-145`).

## Diferencias visibles entre SIMPLIFIED y EXPERT

Las dos rutas abren el **mismo** asistente de 5 pasos; lo que cambia está en el paso 3:

- **Unidades ofrecidas por fuente** (`useEmissionEditorColumns.tsx:59-93`): en `EXPERT` se ofrecen
  todas las `allowedMeasurementUnitIds` de la subcategoría; en `SIMPLIFIED` solo las que tienen
  factor de emisión disponible. Si la subcategoría no declara unidades permitidas
  (`allowedMeasurementUnitIds` vacío), se ofrecen **todas** las unidades en ambos modos.
- **Casilla de total directo** ("Sólo quiero ingresar el total de emisiones"):
  `isTotalManualEmissionsModeAvailable = usageMode === EXPERT || !subcategoryHasDimensions`
  (`apps/api/src/features/carbonInventories/mappers.ts:244-247`). En `EXPERT` está siempre; en
  `SIMPLIFIED` solo en fuentes sin variables. Activa = **todas** las líneas de la fuente con
  `isManualTotalEmissions` (mismo mapper). Al desactivarla reaparecen las líneas de detalle.
- **Texto de ayuda** sobre la grilla, solo en `EXPERT` ("Agrega las fuentes consideradas. Es
  opcional, pero nos ayuda a validar tu cálculo", `EmissionEditor.tsx:156-165`).
- `Factor Propio` está disponible en **ambos** modos; el campo Factor se vuelve editable según la
  fuente del factor (`fieldValidationService.ts:40`, `canEditFactorValue`).

## Reglas y límites

- **Guardado por navegación** (no hay autosave): el paso 3 guarda al cambiar de alcance y al
  presionar Siguiente/Volver (`EmissionCaptureScreen.tsx:214-245`); el paso 2 guarda también con
  Volver (`SubcategoryPreselectionScreen.tsx:118-126`). En el paso 3, Volver **retrocede primero de
  alcance** y solo desde el primero vuelve al paso 2. Los pasos 4 y 5 tienen Volver pero no guardan
  (son de lectura).
- **Salida por el botón del encabezado** (`useExitDialog.ts`, `BusinessProfilingScreen.tsx:163-185`):
  con sesión guarda y sale; sin sesión avisa que se pierden los datos. En el paso 1, si el formulario
  está sucio pero inválido (un inventario recién creado llega sin año ni nombre), ofrece salir **sin
  guardar**; si está limpio, sale directo.
- **Aviso de fuentes incompletas** al salir del último alcance: diálogo Revisar / "Continuar sin
  completar"; lo incompleto no suma al total (`EmissionCaptureScreen.tsx:228-250`).
- **Archivos de evidencia por línea** (`packages/constants/src/carbonInventory.ts:9-33`, fuente única
  de verdad): máx **10 MB** por archivo; MIME permitidos PNG, JPEG, WEBP, GIF, PDF, XLS, XLSX, DOC,
  DOCX, CSV, TXT, ZIP. La API lo valida server-side al confirmar la subida
  (`confirmLineFileUpload/service.ts:51`). El archivo sube al seleccionarlo y queda unido a la línea
  cuando se guarda el paso; igual el comentario.
- **Cuidado al editar la grilla:** ver [[feedback_rhf_setvalue_resetfield_lines]] (nunca `setValue`
  sobre `*.lines`).

## Entidades

- `CarbonInventory` (`usageMode`, `isSelfDeclared`) → `CarbonInventoryLine` → `CarbonInventoryLineInput` / `CarbonInventoryLineFactor` / `CarbonInventoryLineResult`; `CarbonInventoryLineFile`.
- Vistas de subtotales: `CarbonInventorySubtotalsView`, `CarbonInventorySectorSubtotalsView`.

## Estados / badges

- `InventoryStatus` (`schema.prisma:699`) + `CarbonInventoryDisplayStatus` (derivado, `packages/types/src/carbonInventories/schemas.ts:32`): DRAFT → SELF_DECLARED | SUBMITTED_TO_CALCULATION → CALCULATION_REVIEWED|REJECTED|APPROVED → SUBMITTED_TO_VERIFICATION → …
- `CarbonInventoryLineStatus` incluye `OUTDATED`.
- **Editable** solo en `DRAFT`, `SELF_DECLARED`, `CALCULATION_REVIEWED` y `VERIFICATION_REVIEWED`
  (`packages/utils/src/carbonInventory.ts:6-11`) — en la UI: Borrador, Autodeclarada y "Con
  observaciones" (las dos variantes, `apps/web/src/labels/chips/carbonInventory.ts:11-50`). Enviada a
  revisión, rechazada o aprobada → el asistente solo deja ver el resumen. Además, en una huella de
  organización hace falta membresía `CONTRIBUTOR` o `ADMIN`
  (`apps/api/src/features/carbonInventories/helpers.ts:31-71`). **Borrable** solo en `DRAFT`.

## Referencias de código

- `apps/web/src/routes/carbon-inventory/$inventoryId/*.tsx` (business-profiling:7, subcategory-preselection:7, emission-capture:7, emission-summary:7, emission-results:7, claim:82)
- Pantallas: `apps/web/src/screens/CarbonInventory/*` (`BusinessProfilingScreen.tsx:226`, `SubcategoryPreselectionScreen.tsx:205`, `EmissionCaptureScreen.tsx:341`, `EmissionSummaryScreen.tsx:169`, `EmissionResultsScreen.tsx:101`)
- Guard servidor: `useCarbonInventoryRouteGuard.ts:12-37`; API `carbonInventoryAuthorizationPlugin.ts:96-288` (header UUID 184-203)
- keys: `apps/web/src/api/query/carbonInventories/keys.ts:5-156`

## Evidencia

- **código:** rutas de los 5 pasos + claim, pantallas, guard.
- **navegación:** los 5 pasos recorridos en vivo con datos de ejemplo y capturados para el manual
  (`user_manual/screenshots/calculadora_huella/paso1-c…paso5-c.png`).
- **revisión:** capítulo contrastado contra el código el 2026-08-04 (commit d9f75591) —
  `/user-manual:review @calculadora-huella`.

## Dudas abiertas

- Cuando una subcategoría no declara `allowedMeasurementUnitIds`, el paso 3 ofrece **todas** las
  unidades incluso en `SIMPLIFIED` (`useEmissionEditorColumns.tsx:59-62`). Confirmar si es
  intencional o un caso de datos que no debería ocurrir; el manual hoy no lo menciona.
