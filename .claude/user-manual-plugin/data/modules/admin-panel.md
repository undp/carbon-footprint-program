# Administración (panel, organizaciones, solicitudes, usuarios)

- **slug:** admin-panel
- **fuente:** codigo
- **estado:** explorado
- **acceso:** **ADMIN / SUPERADMIN** (cambio de rol de usuario: solo **SUPERADMIN**)

## Propósito

Superficie operativa del panel de administración: KPIs globales, administración de
organizaciones registradas, bandeja de solicitudes (aprobaciones) y gestión de usuarios.
Agrupa 4 secciones del sidebar admin con la misma naturaleza operativa.

## Rutas

- `/admin/dashboard` — KPIs globales, envíos y reconocimientos por año (`routes/admin/dashboard.tsx:19`)
- `/admin/organizations` — administración de organizaciones; bloquear/desbloquear (`routes/admin/organizations.tsx:6`)
- `/admin/requests` — bandeja de solicitudes / aprobaciones (`routes/admin/requests.tsx:6`)
- `/admin/users` — gestión de usuarios/administradores, tabs (`routes/admin/users.tsx:12`)

## Pantallas / vistas

- **Dashboard:** KPIs/gráficos por año (submissions, reconocimientos, desglose por sector/categoría).
- **Organizaciones:** registro/KPIs, bloquear/desbloquear organización.
- **Solicitudes:** cola de revisión de reconocimientos/inscripciones/acceso + KPIs; aprobar/rechazar/revisar (con observaciones).
- **Usuarios:** tabs Usuarios/Admins; promover a admin, cambiar rol (SUPERADMIN), historial de cambios de rol.

## Acciones principales

- Revisar KPIs de la plataforma.
- Bloquear/desbloquear organizaciones.
- Aprobar / rechazar / revisar (observaciones) solicitudes de todos los `SubmissionType`.
- Promover usuario a admin; cambiar rol (SUPERADMIN); ver historial de rol.

## Entidades

- Agregados sobre `Organization`/`OrganizationSummaryView`, `Submission`/`SubmissionSummaryView`, `CarbonInventory`; `User`, `SystemRole`, `UserRoleAudit`.

## Estados / badges

- `SubmissionStatus`: PENDING → APPROVED|APPROVED_AUTOMATICALLY|REJECTED, o PENDING → REVIEWED (observaciones, reenvío).
- `AdminOrganizationDisplayStatus`: NOT_ACCREDITED / ACCREDITED / WITH_MEASUREMENTS / BLOCKED (`apps/web/src/labels/chips/organization.ts:15-51`).
- `SystemRole`: USER / ADMIN / SUPERADMIN (`role.ts:6-25`).

## Referencias de código

- `apps/web/src/routes/admin.tsx:9-11` (`requireRole([ADMIN,SUPERADMIN])`); `routes/admin/{dashboard,organizations,requests,users}.tsx`
- `apps/web/src/screens/AdminDashboard/AdminDashboardScreen.tsx:14-29`; `screens/Maintainer/screens/{AdminOrganizationsScreen.tsx:14-61, AdminRequestsScreen.tsx:12-56, Users/UsersScreen.tsx:29-163}`
- API: `routes/api/admin/{dashboard,organizations,requests}/index.ts` (`[ADMIN,SUPERADMIN]`); `features/users/updateUserRole/route.ts:35-37` (`[SUPERADMIN]`)
- keys: `dashboard/keys.ts:3-15`, `requests/keys.ts:3-11`, `organizations/keys.ts` (admin*), `users/keys.ts:1-9`

## Evidencia

- **código:** rutas, pantallas, guards, endpoints y roles (subagentes de rutas + permisos; `docs/security/rbac.md`).
- **navegación:** NO navegado en vivo — la cuenta de sesión es USER y no accede a `/admin/*`. Requiere cuenta ADMIN/SUPERADMIN.

## Dudas abiertas

- Falta pasada en vivo con cuenta ADMIN/SUPERADMIN para capturar dashboard, bandeja de solicitudes y usuarios con datos.
- ¿Se documenta como un capítulo "Administración" único o se separan Dashboard / Organizaciones / Solicitudes / Usuarios en sub-capítulos?
