# Reconocimientos

- **slug:** reconocimientos
- **fuente:** ambas
- **estado:** explorado
- **acceso:** autenticado; requiere organización creada

## Propósito

Muestra los reconocimientos (sellos) obtenidos por las huellas y proyectos aprobados de la
organización, con KPIs por año.

## Rutas

- `/app/recognitions` — `apps/web/src/routes/app/_shell/recognitions.tsx:4` → `RecognitionsScreen`

## Pantallas / vistas

- Estado vacío: "Aún no tienes organizaciones creadas" → botón "Ir a Mi Organización".
- Con datos: tabla de reconocimientos por organización/año + KPIs (sellos de medición/verificación).

## Acciones principales

- Consultar reconocimientos por organización y año.
- Ver / descargar sellos obtenidos.

## Entidades

- `Badge` (por `BadgeType`), `Submission` aprobadas, `Organization`; `File` (PDF del sello).

## Estados / badges

- `BadgeType`: cálculo huella, verificación huella, verificación proyecto reducción, acreditación organización.
- `BadgeStatus`: ACTIVE | INACTIVE.

## Referencias de código

- `apps/web/src/routes/app/_shell/recognitions.tsx:4`
- `apps/web/src/screens/Recognitions/RecognitionsScreen.tsx:28-109`
- keys: `apps/web/src/api/query/badges/keys.ts:1-6`, `submissions/keys.ts`

## Evidencia

- **código:** ruta, pantalla, keys.
- **navegación:** estado vacío recorrido en vivo ("Aún no tienes organizaciones creadas" → Ir a Mi Organización).

## Dudas abiertas

- Capturar con reconocimientos otorgados (requiere una huella/proyecto aprobado). Confirmar KPIs mostrados.
