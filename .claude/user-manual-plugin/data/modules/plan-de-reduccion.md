# Plan de reducción

- **slug:** plan-de-reduccion
- **fuente:** ambas
- **estado:** explorado
- **acceso:** autenticado; requiere tener al menos una huella

## Propósito

Muestra iniciativas de reducción sugeridas para una huella, navegables por categoría /
subcategoría, y permite exportarlas a Excel. El contenido de iniciativas lo administra
[[mantenedor-contenido]].

## Rutas

- `/app/reduction-plan` — `apps/web/src/routes/app/_shell/reduction-plan.tsx:10` → `ReductionPlanScreen`

## Pantallas / vistas

- Estado vacío: "Aún no tienes una huella" → botón "Ir a Huella Organizacional".
- Con huella: iniciativas sugeridas por categoría/subcategoría; exportación a Excel.
- Selector de organización/huella (query `?organizationId=`).

## Acciones principales

- Navegar iniciativas por categoría/subcategoría.
- Exportar el plan a Excel.

## Entidades

- `ReductionPlanInitiative` (catálogo, por subcategoría/dimensión), `Subcategory`, `EmissionFactorDimensionValue`; lee la `CarbonInventory` seleccionada.

## Estados / badges

- No tiene estados propios; depende de la existencia de una huella.

## Referencias de código

- `apps/web/src/routes/app/_shell/reduction-plan.tsx:10`
- `apps/web/src/screens/ReductionPlan/ReductionPlanScreen.tsx:212-248`
- hooks: `useSuggestedReductionPlan.ts`, `useReductionPlan.ts`; keys en `carbonInventories/keys.ts:149-155` (`reductionPlan`)

## Evidencia

- **código:** ruta, pantalla, hooks.
- **navegación:** estado vacío recorrido en vivo ("Aún no tienes una huella" → Ir a Huella Organizacional).

## Dudas abiertas

- Capturar el estado con iniciativas (requiere una huella con subcategorías). Confirmar el formato de exportación a Excel.
