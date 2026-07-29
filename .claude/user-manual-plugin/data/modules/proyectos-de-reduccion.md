# Proyectos de reducción

- **slug:** proyectos-de-reduccion
- **fuente:** ambas
- **estado:** explorado
- **acceso:** autenticado; requiere organización **inscrita/acreditada** + huella verificada aprobada; edición/postulación con rol org **CONTRIBUTOR**/**ADMIN**

## Propósito

Gestión de proyectos de reducción de emisiones de la organización: crear, editar, ver y
postular a verificación (con declaración jurada y documentos).

## Rutas

- `/app/reduction-projects` — listado (`routes/app/_shell/reduction-projects/index.tsx:4` → `ReductionProjectsScreen`)
- `/app/reduction-projects/new` — crear (`_fullscreen/.../new.tsx:4`, `mode="create"`)
- `/app/reduction-projects/$id/details` — ver (`mode="view"`)
- `/app/reduction-projects/$id/edit` — editar (`mode="edit"`)

## Pantallas / vistas

- Estado gated: "Sin organizaciones inscritas — Recuerda inscribir tu organización antes de ingresar un proyecto de reducción" → botón "Ir a Mi Organización".
- Listado de proyectos + acciones.
- Formulario a pantalla completa (crear/editar/ver): escenario base vs proyecto.
- Diálogo de postulación (declaración jurada + carga de documentos).

## Acciones principales

- Ingresar proyecto, editar borrador, ver detalle.
- Postular a verificación (declaración jurada + adjuntos).
- Eliminar, descargar.

## Entidades

- `ReductionProject` (org + `CarbonInventory` + subcategoría opcional, baseline/project), `SubmissionSubjectReductionProject`, `Submission`, `Badge`.

## Estados / badges

- `ReductionProjectDisplayStatus` (derivado): DRAFT → SUBMITTED → REVIEWED|REJECTED|APPROVED → DELETED (`packages/types/src/reductionProjects/schemas.ts:4`; labels `apps/web/src/labels/chips/reductionProject.ts:11-40`).

## Referencias de código

- `apps/web/src/routes/app/_shell/reduction-projects/index.tsx:4`, `_fullscreen/reduction-projects/*`
- `apps/web/src/screens/ReductionProjects/ReductionProjectsScreen.tsx:303-388`
- `apps/web/src/screens/ReductionProject/ReductionProjectScreen.tsx:40-357` (modos create/edit/view)
- `components/Dialogs/PostulateReductionProjectDialog.tsx:1-50`
- Guard servidor: `useReductionProjectRouteGuard.ts:23-49`; roles `reductionProjects/helpers.ts:20-23`

## Evidencia

- **código:** rutas, pantallas, formulario, diálogos, guard.
- **navegación:** estado gated recorrido en vivo ("Sin organizaciones inscritas" → Ir a Mi Organización).

## Dudas abiertas

- Capturar el formulario y la postulación con una organización acreditada + huella verificada aprobada (precondición dura del módulo).
