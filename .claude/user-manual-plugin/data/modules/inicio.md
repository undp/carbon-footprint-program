# Inicio (onboarding y panel personal)

- **slug:** inicio
- **fuente:** ambas
- **estado:** explorado
- **acceso:** autenticado (USER / ADMIN / SUPERADMIN)

## Propósito

Pantalla de entrada tras iniciar sesión. Mientras el onboarding está incompleto, muestra un
"camino" guiado con pasos secuenciales; una vez completo, funciona como panel personal de
emisiones (selector de año/huella + resultados).

## Rutas

- `/app/home` — `apps/web/src/routes/app/_shell/home.tsx:4` → `HomeScreen`

## Pantallas / vistas

- Hero "¡Hola! 👋 — Completa estos pasos para empezar".
- Acceso rápido "¿Solo quieres explorar? — Usar calculadora".
- Checklist "Tu camino en Huella Latam": (1) Crea tu huella, (2) Crea tu organización, (3) Asocia tu huella a la organización [bloqueado], (4) Inscribe tu organización [bloqueado]. Chips EMPIEZA AQUÍ / CONTINÚA AQUÍ / DESPUÉS.
- Estado "completado" → botón "Ir a mi dashboard" (panel de emisiones).

## Acciones principales

- Crear huella, crear organización, asociar huella, inscribir organización (según paso).
- Ir a la calculadora (explorar).
- Ir al dashboard personal cuando el onboarding está completo.

## Entidades

- `User`, `UserOnboardingCompletion`; agrega `Organization` y `CarbonInventory` del usuario.

## Estados / badges

- Estado de completitud del onboarding (pasos bloqueados/desbloqueados).

## Referencias de código

- `apps/web/src/routes/app/_shell/home.tsx:4`
- `apps/web/src/screens/Home/HomeScreen.tsx:33-137`
- `apps/web/src/screens/Home/components/WelcomeHome.tsx`, `components/onboardingSteps.ts`
- Guard shell: `apps/web/src/routes/app.tsx:8-13` (`requireRole([USER,ADMIN,SUPERADMIN])`)

## Evidencia

- **código:** ruta, pantalla, pasos de onboarding.
- **navegación:** home recorrido en vivo con cuenta USER nueva (onboarding incompleto: pasos 1-2 activos, 3-4 bloqueados).

## Dudas abiertas

- Capturar también el estado "dashboard" (onboarding completo) — requiere una cuenta con huella + organización.
