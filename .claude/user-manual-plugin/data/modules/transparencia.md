# Transparencia pública

- **slug:** transparencia
- **fuente:** ambas
- **estado:** explorado
- **acceso:** público (sin autenticación)

## Propósito

Directorio público de las organizaciones comprometidas con medir, verificar y reducir su
huella de carbono. Permite a cualquier persona consultar quién participa y qué
reconocimiento alcanzó.

## Rutas

- `/transparency` — `apps/web/src/routes/transparency.tsx:4` → `TransparencyScreen`

## Pantallas / vistas

- Encabezado "Transparencia" con ícono de ayuda (i) y descripción.
- Buscador por organización / rubro / sub-rubro.
- Filtro por año.
- Tabla: Nombre organización · Rubro · Sub-rubro · Año · Tipo de Reconocimiento.
- Estado vacío: "No hay organizaciones disponibles" (paginación 0-0 de 0 en el entorno demo).

## Acciones principales

- Buscar y filtrar organizaciones.
- Ver el tipo de reconocimiento (sello) por organización.

## Entidades

- Agregado público sobre `Organization` / `CarbonInventory` (vista de transparencia).

## Estados / badges

- Tipo de reconocimiento por `BadgeType` (cálculo, verificación huella, verificación proyecto, acreditación).

## Referencias de código

- `apps/web/src/routes/transparency.tsx:4`
- `apps/web/src/screens/Transparency/TransparencyScreen.tsx:19-114`
- API: `apps/api/src/features/transparency/getTransparencyData/route.ts` (mode: public)
- keys: `apps/web/src/api/query/transparency/keys.ts:1-4`

## Evidencia

- **código:** ruta pública, pantalla, endpoint público.
- **navegación:** vista renderizada en vivo (tabla vacía en el entorno demo, sin datos sembrados).

## Dudas abiertas

- En el entorno demo la tabla está vacía; para el manual conviene un screenshot con datos (sembrar o usar un entorno con organizaciones reconocidas).
- Ver [[project_org_summary_view_year_window]]: el filtro de año puede mostrar 0 si el año de la huella cae fuera del rango de medición configurado.
