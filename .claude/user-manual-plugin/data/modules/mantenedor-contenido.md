# Mantenedor: sellos, iniciativas y explicaciones

- **slug:** mantenedor-contenido
- **fuente:** codigo
- **estado:** explorado
- **acceso:** **ADMIN / SUPERADMIN** (sellos/badges: SUPERADMIN)

## Propósito

Administración de contenido que alimenta la experiencia de usuario: sellos/insignias de
reconocimiento, iniciativas sugeridas para los planes de reducción y las explicaciones de
ayuda contextual (íconos "i").

## Rutas

- `/admin/badges` — sellos/insignias (`admin/badges.tsx:7`, UI SUPERADMIN)
- `/admin/reduction-plan-initiatives` — iniciativas de planes de reducción (`admin/reduction-plan-initiatives.tsx:4`)
- `/admin/explanations` — contenido de ayuda "i" mostrado a usuarios (`admin/explanations.tsx:5`)

## Pantallas / vistas

- **Sellos:** catálogo por tipo (cálculo, verificación huella, verificación proyecto reducción, acreditación org); activar/desactivar; historial.
- **Iniciativas:** catálogo de iniciativas sugeridas por subcategoría (alimenta [[plan-de-reduccion]]).
- **Explicaciones:** editor de textos markdown que se muestran en los popovers "Más información" (i) de la app.

## Acciones principales

- Gestionar catálogo de sellos; activar/desactivar (uno activo por tipo).
- CRUD de iniciativas de plan de reducción.
- CRUD de explicaciones (markdown de ayuda).

## Entidades

- `Badge` (por `BadgeType`), `File` (PDF del sello); `ReductionPlanInitiative`; `Explanation` (markdown por slug).

## Estados / badges

- `BadgeStatus`: ACTIVE | INACTIVE (uno activo por `BadgeType`; labels `apps/web/src/labels/chips/badge.ts:3-19`).

## Referencias de código

- `apps/web/src/routes/admin/{badges,reduction-plan-initiatives,explanations}.tsx`
- Sidebar: `screens/Maintainer/layout/MaintainerLayout.tsx:156-166`
- `screens/Maintainer/screens/Badges/BadgesScreen.tsx:9-70`
- keys: `badges/keys.ts:1-6`; hooks `useBadgeCatalog.ts`, `useActivateBadge.ts`, `useDeactivateBadge.ts`
- API: `routes/api/badges/index.ts:12-16` (`[SUPERADMIN]`); `GET /explanations/:slug` es público
- Ver [[feedback_explanation_markdowns]]: las explicaciones son texto de cara al usuario (nada de notas de despliegue/arquitectura).

## Evidencia

- **código:** rutas, sidebar, pantalla de sellos, keys, endpoints (subagentes rutas + permisos + entidades).
- **navegación:** NO navegado en vivo (cuenta USER; UI ADMIN/SUPERADMIN).

## Dudas abiertas

- Falta pasada en vivo con ADMIN/SUPERADMIN para capturar sellos, iniciativas y el editor de explicaciones.
- Confirmar qué sellos existen por defecto y su relación con los `SubmissionType`.
