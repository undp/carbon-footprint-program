# Landing / acceso público

- **slug:** landing
- **fuente:** ambas
- **estado:** explorado
- **acceso:** público (sin autenticación)

## Propósito

Página de bienvenida pública de Huella Latam. Presenta la plataforma y ofrece dos
caminos para empezar a medir una huella de carbono: usar la calculadora guiada o subir
los propios cálculos. Muestra el aviso de "Ambiente Demo" (T&C).

## Rutas

- `/` — Landing (`apps/web/src/routes/index.tsx:18` → `LandingScreen`)
- `/about`, `/capinaut` — placeholders "en construcción" (excluir del manual)

## Pantallas / vistas

- Landing con header público (logo, "Transparencia", botón según sesión).
- Hero "Te damos la bienvenida a Huella Latam" + banner Ambiente Demo (T&C).
- Dos tarjetas: "Quiero calcular mi huella" (USAR CALCULADORA) y "Ya tengo mis cálculos" (SUBIR EMISIONES).

## Acciones principales

- **Usar calculadora** → inicia el flujo de cálculo (`/carbon-inventory/$id/business-profiling`).
- **Subir emisiones** → mismo flujo, modo carga de datos.
- **Iniciar sesión** (header) → redirección OIDC a CIAM (UNDP).
- Header dinámico: no logueado → "INICIAR SESIÓN"; USER → "IR AL HOME"; ADMIN → "IR AL ADMIN".

## Entidades

- Ninguna propia; punto de entrada que crea un `CarbonInventory` anónimo al usar la calculadora.

## Estados / badges

- No aplica.

## Referencias de código

- `apps/web/src/routes/index.tsx:18`
- `apps/web/src/screens/Landing/LandingScreen.tsx:9,42-53`
- `apps/web/src/screens/Landing/components/Header.tsx:18`
- `apps/web/src/screens/Landing/components/CreateInventoryOptions.tsx`
- `apps/web/src/screens/Landing/components/TermsAlert.tsx`
- `apps/web/src/interfaces/routes/landingRoutes.ts:4-7` (nav; "Capinaut" comentado)

## Evidencia

- **código:** rutas, header y tarjetas.
- **navegación:** landing renderizada en vivo (hero verde, banner demo, 2 tarjetas, INICIAR SESIÓN).

## Dudas abiertas

- ¿Se documentan `/about` y `/capinaut` como "próximamente" o se omiten? (hoy son placeholders).
