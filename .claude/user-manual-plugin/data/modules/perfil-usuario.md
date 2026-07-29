# Perfil de usuario

- **slug:** perfil-usuario
- **fuente:** ambas
- **estado:** explorado
- **acceso:** autenticado (cualquier rol)

## Propósito

Formulario de datos personales del usuario (post-registro / edición), necesario para guardar
el progreso y aceptar los términos.

## Rutas

- `/app/user/form` — `apps/web/src/routes/app/_shell/user/form.tsx:5` → `UserFormScreen`

## Pantallas / vistas

- "Completa tus datos — Así podrás guardar tu progreso".
- Campos: Email (prellenado, bloqueado), Nombre*, Apellido*, Cargo (selector).
- Checkbox de aceptación de términos y condiciones + política de uso de datos personales.
- Botón GUARDAR. Layout split con imagen de marca a la derecha.

## Acciones principales

- Completar/editar nombre, apellido y cargo.
- Aceptar términos y condiciones.
- Guardar perfil.

## Entidades

- `User` (rol de sistema, vínculo IdP), `UserOnboardingCompletion`; catálogo `CountryJobPosition` (Cargo).

## Estados / badges

- No aplica.

## Referencias de código

- `apps/web/src/routes/app/_shell/user/form.tsx:5`
- `apps/web/src/screens/User/UserFormScreen.tsx:31-211`
- API: `apps/api/src/features/users/getMe/route.ts`; keys `users/keys.ts` (`me`, `updateMyProfile`), `termsConditions/keys.ts`

## Evidencia

- **código:** ruta, pantalla, campos.
- **navegación:** formulario recorrido en vivo (Email bloqueado con la cuenta actual, Nombre/Apellido/Cargo, checkbox T&C, GUARDAR).

## Dudas abiertas

- Confirmar el catálogo de "Cargo" (opciones) y las validaciones del formulario.
