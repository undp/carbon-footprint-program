# Mantenedor: metodología de cálculo

- **slug:** mantenedor-metodologia
- **fuente:** codigo
- **estado:** explorado
- **acceso:** **SUPERADMIN** (en la UI; la API de factores/dimensiones es más laxa — ver dudas)

## Propósito

Administración del contenido metodológico que define **cómo se calcula** la huella: versiones
de metodología por país, categorías/alcances, subcategorías, dimensiones/variables, factores
de emisión y recomendaciones de subcategorías por rubro. Grillas editables inline.

## Rutas

- `/admin/methodologies` — versiones de metodología (`routes/admin/methodologies.tsx:7`)
- `/admin/categories` — categorías/alcances (`admin/categories.tsx:7`)
- `/admin/subcategories` — subcategorías (`admin/subcategories.tsx:7`)
- `/admin/dimensions` — dimensiones/variables (`admin/dimensions.tsx:4`)
- `/admin/emission-factors` — factores de emisión (`admin/emission-factors.tsx:7`)
- `/admin/subcategory-recommendations` — recomendaciones por rubro (`admin/subcategory-recommendations.tsx:6`)

## Pantallas / vistas

- Grillas de datos editables inline por versión de metodología: agregar/editar/eliminar fila, reordenar, editor markdown de "explicación", modo solo-lectura cuando la versión no es la editable/activa.

## Acciones principales

- Crear/editar/eliminar versiones, categorías, subcategorías, dimensiones y valores, factores de emisión.
- Definir recomendaciones de subcategorías por sector+subsector (preselección en la calculadora).
- Editar textos de ayuda (markdown) asociados.

## Entidades

- `MethodologyVersion` → `Category` → `Subcategory` → `SubcategoryMeasurementUnit`; `EmissionFactorDimension` → `EmissionFactorDimensionValue` → `EmissionFactor` (value + gasDetails JSON); `SubcategoryRecommendation`.

## Estados / badges

- `MethodologyVersionStatus`: PUBLISHED | UNPUBLISHED | DELETED (labels `apps/web/src/labels/chips/methodology.ts:8-22`: Activa/Inactiva/Eliminada).
- Catálogos con soft-delete `ACTIVE|DELETED` (`SubcategoryStatus`, `EmissionFactorStatus`, …).

## Referencias de código

- `apps/web/src/routes/admin/{methodologies,categories,subcategories,dimensions,emission-factors,subcategory-recommendations}.tsx` (UI `requireRole([SUPERADMIN])` en methodologies/categories/subcategories/emission-factors)
- Patrón CRUD: `apps/web/src/screens/Maintainer/screens/CategoriesMaintainerScreen.tsx:50-605`
- Sidebar: `screens/Maintainer/layout/MaintainerLayout.tsx:46-77`
- keys (token de dependencia): `apps/web/src/api/query/maintainer/keys.ts:1-146` (ver [[project_maintainer_dependency_keys]])
- API: `routes/api/admin/methodologies/index.ts:24` (`[ADMIN,SUPERADMIN]`)

## Estados / badges — nota

- El sistema de query-keys usa **tokens de dependencia** (`maintainer/keys.ts:27-41`): editar una categoría refresca al instante las listas derivadas en otras pantallas.

## Evidencia

- **código:** rutas, pantallas CRUD, sidebar, keys, endpoints (subagentes rutas + permisos + entidades).
- **navegación:** NO navegado en vivo (cuenta USER; UI SUPERADMIN).

## Dudas abiertas

- **Brecha UI vs API:** las pantallas de categorías/subcategorías/metodologías/factores son SUPERADMIN-only en la UI, pero varios endpoints permiten también ADMIN, y `emission-factors`/`emission-factor-dimensions` en API no fijan `systemRoles` (cualquier autenticado podría llamarlos). Confirmar comportamiento esperado para el manual.
- Falta pasada en vivo con SUPERADMIN para capturar las grillas con datos.
