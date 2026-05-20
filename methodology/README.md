# Methodology — Análisis y correcciones de `methodologies.json`

Carpeta que agrupa todos los análisis realizados sobre el seed `packages/database/src/prisma/seeds/data/base/methodologies.json` y los reportes asociados a las correcciones aplicadas.

## Índice de documentos

| Archivo                                                                                      | Tipo               | Contenido                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`consistency-report.md`](./consistency-report.md)                                           | Análisis           | Revisión inicial de consistencia interna del seed (dimensiones declaradas vs factores, combinaciones cartesianas, nomenclatura).                                                                                                           |
| [`methodologies-audit.md`](./methodologies-audit.md)                                         | Auditoría          | Primera auditoría comparativa contra fuentes secundarias y documentación interna del proyecto.                                                                                                                                             |
| [`methodologies-deep-audit.md`](./methodologies-deep-audit.md)                               | Auditoría profunda | Verificación numérica exhaustiva contra DEFRA 2025, IPCC 2006, IPCC AR5/AR6, Kool 2012. Identifica los 7 hallazgos críticos de valor + 20 estructurales + ~25 menores. **Base de las correcciones aplicadas.**                             |
| [`methodologies-corrections-report.md`](./methodologies-corrections-report.md)               | Reporte de cambios | Detalle de las 13 ediciones aplicadas al JSON (9 hallazgos críticos agrupados), con prioridad IPCC > DEFRA y justificación por factor.                                                                                                     |
| [`methodologies-meeting-review-2026-05-19.md`](./methodologies-meeting-review-2026-05-19.md) | Reporte de cambios | Correcciones derivadas de la revisión metodológica con consultores externos (Lorenzo, Gianluca, Lucas, Dolores). 25 factores + 1 item removido (Lubricantes), con cita textual de la reunión y respaldo DEFRA 2025 / IPCC 2006 por cambio. |

## Orden de lectura sugerido

1. `consistency-report.md` — entender la estructura del seed.
2. `methodologies-audit.md` — primera pasada de comparación con fuentes.
3. `methodologies-deep-audit.md` — verificación final contra fuentes primarias.
4. `methodologies-corrections-report.md` — qué se corrigió, por qué y con qué fuente.

## Estado del seed

A la fecha del último commit en esta carpeta, las **7 inconsistencias críticas de valor** identificadas en la auditoría profunda están corregidas en el JSON, más las **3 familias de correcciones derivadas de la revisión metodológica con expertos** (Lubricantes eliminados, Agua re-separada por consumo/tratamiento, Disposición de residuos sólidos realineada a DEFRA 2025). Los hallazgos estructurales (GWP versionado, ISO 14064 coverage, country-agnosticism, refrigerantes/procesos faltantes, esquema de auditabilidad, electricidad como combustible para vehículos eléctricos, referencia temporal explícita) **siguen abiertos** — ver `methodologies-corrections-report.md` y `methodologies-meeting-review-2026-05-19.md`.

## Fuentes consultadas

- DEFRA UK 2025 GHG Conversion Factors.
- IPCC 2006 Guidelines for National Greenhouse Gas Inventories (Vol. 2, 3, 4).
- IPCC 2019 Refinement.
- IPCC AR5 WG1 (2014) Tabla 8.A.1 — GWP-100.
- IPCC AR6 WG1 (2021) Tabla 7.SM.7 — GWP-100 actualizado.
- Kool, Marinussen & Blonk (2012) — fertilizantes.
- ISO 14064-1:2018, ISO 14064-3:2019, ISO 14067:2018.
- GHG Protocol Corporate Standard (2004), Scope 2 Guidance (2015), Scope 3 Standard (2011).
