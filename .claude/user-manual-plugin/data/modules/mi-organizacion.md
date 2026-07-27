# Mi organización

- **slug:** mi-organizacion
- **fuente:** ambas
- **estado:** explorado
- **acceso:** autenticado; gestión (editar / usuarios / acreditar) solo para rol de organización **ADMIN**

## Propósito

Perfil de la organización propia y gestión de sus miembros/roles. Desde aquí se solicita la
acreditación (inscripción oficial) de la organización.

## Rutas

- `/app/my-organization` — `apps/web/src/routes/app/_shell/my-organization.tsx:4` → `MyOrganizationScreen`

## Pantallas / vistas

- Estado vacío: "Aún no tienes organizaciones creadas" + botón CREAR ORGANIZACIÓN.
- Con organización: perfil (datos versionados) + lista de usuarios/roles.
- Diálogo de confirmación de acreditación (con adjuntos).

## Acciones principales

- Crear / editar organización (org-ADMIN).
- Postular a acreditación con adjuntos (org-ADMIN).
- Agregar usuario, cambiar rol, eliminar usuario (org-ADMIN).
- Roles de organización: `VIEWER` / `CONTRIBUTOR` / `ADMIN`.

## Entidades

- `Organization`, `OrganizationData` (perfil versionado: una ACTIVE + opcional DRAFT/SUBMITTED), `UserOrganizationMembership`.
- Catálogos: `CountryOrganizationSize`, `CountrySector`/`CountrySubsector`, `OrganizationMainActivity`, `CountryJobPosition`.

## Estados / badges

- `OrganizationDisplayStatus` (derivado): NOT_ACCREDITED → ACCREDITED → BLOCKED (`packages/types/src/organizations/schemas.ts:13`).
- `OrganizationDataStatus`: OUTDATED | ACTIVE (los estados DRAFT/SUBMITTED del perfil viven como `Submission`).
- `MembershipStatus`: ACTIVE | OUTDATED | DELETED.

## Referencias de código

- `apps/web/src/routes/app/_shell/my-organization.tsx:4`
- `apps/web/src/screens/MyOrganization/MyOrganizationScreen.tsx:135-234` (gestión de usuarios/editar sólo si `myOrganizationRole === ADMIN`, :179,189)
- `apps/web/src/screens/MyOrganization/components/AccreditationConfirmDialog.tsx:17-45`
- API org-ADMIN: `apps/api/src/routes/api/app/organizations/index.ts:15-30`
- keys: `apps/web/src/api/query/organizations/keys.ts:3-41`

## Evidencia

- **código:** ruta, pantalla, diálogos, gating por rol de organización.
- **navegación:** estado vacío recorrido en vivo ("Aún no tienes organizaciones creadas" + CREAR ORGANIZACIÓN).

## Dudas abiertas

- Capturar el estado "con organización" (perfil + tabla de usuarios + acreditación) — requiere crear una organización de prueba.
- Confirmar el formulario de creación/edición y sus campos.
