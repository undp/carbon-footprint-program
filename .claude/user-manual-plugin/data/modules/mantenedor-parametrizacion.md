# Mantenedor: unidades y parametrización de país

- **slug:** mantenedor-parametrizacion
- **fuente:** codigo
- **estado:** explorado
- **acceso:** **ADMIN / SUPERADMIN** (unidades de tasa: SUPERADMIN en la UI)

## Propósito

Administración de los catálogos que parametrizan el cálculo y el perfilamiento por país:
unidades de medida (magnitudes, unidades, tasas) y catálogos de perfilamiento (rubros,
sub-rubros, actividades principales, tamaños de organización).

## Rutas

**Unidades**

- `/admin/magnitudes` — magnitudes físicas (`admin/magnitudes.tsx:6`)
- `/admin/units` — unidades de medida (`admin/units.tsx:6`)
- `/admin/rate-measurement-units` — unidades de tasa (`admin/rate-measurement-units.tsx:7`, UI SUPERADMIN)

**Perfilamiento**

- `/admin/sectors` — rubros (`admin/sectors.tsx:4`)
- `/admin/subsectors` — sub-rubros (`admin/subsectors.tsx:4`)
- `/admin/main-activities` — actividades principales (`admin/main-activities.tsx:4`)
- `/admin/organization-sizes` — tamaños de organización (`admin/organization-sizes.tsx:4`)

## Pantallas / vistas

- Grillas de catálogo editables (agregar/editar/eliminar), agrupadas en el sidebar en "Unidades" y "Perfilamiento".

## Acciones principales

- CRUD de magnitudes, unidades y unidades de tasa.
- CRUD de rubros, sub-rubros, actividades principales y tamaños de organización.

## Entidades

- `Magnitude` → `MeasurementUnit` (base factor/isBase), `RateMeasurementUnit` (numerador/denominador).
- `CountrySector` → `CountrySubsector`, `OrganizationMainActivity`, `CountryOrganizationSize`; `Country`, `CountryParameter`, `SystemParameter`.

## Estados / badges

- Soft-delete `ACTIVE|DELETED` en los catálogos (`CountrySectorStatus:96`, `MagnitudeStatus:396`, …). Ver [[feedback_soft_delete_filter_inline]].

## Referencias de código

- `apps/web/src/routes/admin/{magnitudes,units,rate-measurement-units,sectors,subsectors,main-activities,organization-sizes}.tsx`
- Sidebar: `screens/Maintainer/layout/MaintainerLayout.tsx:79-129`; `screens/Maintainer/constants.ts:25-40`
- keys: `measurementUnits/keys.ts` (+ tokens en `maintainer/keys.ts:128-145`), `countrySectors/keys.ts`, `countrySubsectors/keys.ts`, `countryOrganizationSizes/keys.ts`, `organizationMainActivities/keys.ts`
- API selectores públicos: `/country-organization-sizes`, `/country-sectors`, `/organization-main-activities`, `/measurement-units(+/rates)` (mode public, para la calculadora)

## Evidencia

- **código:** rutas, sidebar, keys, endpoints (subagentes rutas + entidades + permisos).
- **navegación:** NO navegado en vivo (cuenta USER; UI ADMIN/SUPERADMIN).

## Dudas abiertas

- Ver [[project_maintainer_dependency_keys]]: dos namespaces de measurement-unit requieren invalidación cruzada.
- Falta pasada en vivo con ADMIN/SUPERADMIN para capturar los catálogos con datos.
