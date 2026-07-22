# Huella organizacional (gestión de inventarios)

- **slug:** huella-organizacional
- **fuente:** ambas
- **estado:** explorado
- **acceso:** autenticado; edición/postulación requieren rol de organización **CONTRIBUTOR** o **ADMIN**

## Propósito

Listado y gestión de las huellas (borradores e inventarios) de las organizaciones del
usuario. Desde aquí se crean, editan, autodeclaran y postulan huellas a cálculo o a
reconocimiento de verificación. El flujo de edición es [[calculadora-huella]].

## Rutas

- `/app/carbon-inventories` — `apps/web/src/routes/app/_shell/carbon-inventories.tsx:3` → `CarbonInventoriesScreen`

## Pantallas / vistas

- Título "Huella Organizacional" + ayuda (i); filtros Organización y Año.
- Tabs **Borradores** / **Huellas autodeclaradas**.
- Tabla: Nombre · Año de medición · Emisiones (tCO₂e) · Estado postulación · Acciones.
- Botón NUEVA HUELLA (diálogo de creación).
- Diálogos: autodeclarar, asociar organización, confirmar cálculo, postular verificación (con adjuntos), historial de solicitudes.

## Acciones principales

- Crear / editar / duplicar / descargar / eliminar (borradores) huella.
- Asociar huella a una organización.
- Autodeclarar; postular a cálculo; postular a reconocimiento de verificación (con adjuntos).
- Ver historial de solicitudes de una huella.

## Entidades

- `CarbonInventory` + líneas/inputs/factores/resultados (ver [[calculadora-huella]]), `SubmissionSubjectCarbonInventory`, `Submission`, `Badge`.

## Estados / badges

- `CarbonInventoryDisplayStatus` (derivado): DRAFT → SELF_DECLARED | SUBMITTED_TO_CALCULATION → CALCULATION_REVIEWED|REJECTED|APPROVED → SUBMITTED_TO_VERIFICATION → VERIFICATION_REVIEWED|REJECTED|APPROVED → DELETED. Labels: `apps/web/src/labels/chips/carbonInventory.ts:11-65`.
- Estado de postulación (`SubmissionStatus`): Pendiente / Con Observaciones / Aprobada / Otorgado / Rechazada.

## Referencias de código

- `apps/web/src/routes/app/_shell/carbon-inventories.tsx:3`
- `apps/web/src/screens/CarbonInventories/CarbonInventoriesScreen.tsx:35-188`
- `components/DraftsTab/DraftActionsCell.tsx:158-266`, `components/InventoriesTab/InventoryActionsCell.tsx:253-373`
- Diálogos: `SelfDeclareCarbonInventoryDialog.tsx:65`, `AssociateOrganizationDialog.tsx:103`, `CalculationConfirmationDialog.tsx:27-41`
- Roles de edición: `apps/api/src/features/carbonInventories/helpers.ts:31-34` (`CARBON_INVENTORY_EDIT_ROLES`)

## Evidencia

- **código:** ruta, pantalla, tabs, celdas de acciones, diálogos, roles.
- **navegación:** listado recorrido en vivo (tabs Borradores/Huellas autodeclaradas, filtros, columnas, NUEVA HUELLA; tabla vacía).

## Dudas abiertas

- Capturar con datos: un borrador y una huella autodeclarada/postulada, y el menú de acciones abierto.
- Ver [[project_ky_json_empty_body]] al documentar acciones de mutación (autodeclarar/postular) — respuestas sin body.
