# Plan de Implementación: Vista Pública de Reconocimientos

## Resumen

Implementación de un endpoint público `GET /api/public/recognitions` y una vista frontend en `/transparency` que muestra organizaciones activas con reconocimientos aprobados. El trabajo se divide en 3 bloques paralelizables: backend, frontend wiring (tipos + hooks), y frontend UI. Se usa TypeScript en todo el stack.

## Tareas

- [x] 1. Crear tipos compartidos y esquemas Zod en `@repo/types`
  - [x] 1.1 Crear esquemas Zod para la respuesta del endpoint público
    - Crear `packages/types/src/publicRecognitions/schemas.ts` con `PublicRecognitionItemSchema` y `GetPublicRecognitionsResponseSchema`
    - Crear `packages/types/src/publicRecognitions/types.ts` con tipos inferidos `PublicRecognitionItem` y `GetPublicRecognitionsResponse`
    - Crear `packages/types/src/publicRecognitions/index.ts` con re-exports
    - Modificar `packages/types/src/index.ts` para agregar `export * from "./publicRecognitions/index.js"`
    - _Requisitos: 1.2, 1.7_

- [x] 2. Implementar el endpoint backend
  - [x] 2.1 Crear el servicio `getPublicRecognitionsService`
    - Crear `apps/api/src/features/publicRecognitions/getPublicRecognitions/service.ts`
    - Implementar query Prisma que navega Organization → CarbonInventory → SubmissionSubject → Submission (APPROVED) → Badge
    - Filtrar solo organizaciones con status ACTIVE y submissions con status APPROVED
    - Aplanar resultados en array de `PublicRecognitionItem` usando `tradeName ?? legalName` como nombre
    - _Requisitos: 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 2.2 Crear el handler HTTP
    - Crear `apps/api/src/features/publicRecognitions/getPublicRecognitions/handler.ts`
    - Invocar el servicio con `request.server.prisma` y responder con HTTP 200
    - _Requisitos: 1.1_

  - [x] 2.3 Crear la ruta Fastify y registrarla
    - Crear `apps/api/src/features/publicRecognitions/getPublicRecognitions/route.ts` con schema Zod y `config: { public: true }`
    - Crear `apps/api/src/routes/api/public/recognitions/index.ts` para registrar la ruta bajo `/api/public/recognitions`
    - Crear `apps/api/src/routes/api/public/index.ts` para registrar el scope `/api/public` sin auth hooks
    - _Requisitos: 1.1, 1.7_

  - [x]\* 2.4 Escribir tests unitarios del servicio backend
    - Test: el servicio retorna datos correctos para reconocimientos aprobados (Req 1.2, 1.3)
    - Test: el servicio excluye submissions no aprobadas — PENDING, REJECTED, OBJECTED (Req 1.3)
    - Test: el servicio excluye organizaciones no activas — BLOCKED (Req 1.4)
    - Test: el servicio retorna array vacío cuando no hay reconocimientos (Req 1.6)
    - _Requisitos: 7.1, 7.2_

  - [x]\* 2.5 Escribir test de propiedad: Correctitud de la salida del servicio
    - **Propiedad 1: Correctitud de la salida del servicio**
    - Generar estados de BD arbitrarios con fast-check y verificar que cada elemento retornado tiene campos válidos, organización ACTIVE y submission APPROVED
    - Mínimo 100 iteraciones, tag: `Feature: public-recognitions-view, Property 1: Correctitud de la salida del servicio`
    - **Valida: Requisitos 1.2, 1.3, 1.4**

  - [x]\* 2.6 Escribir test de propiedad: Una entrada por reconocimiento
    - **Propiedad 2: Una entrada por reconocimiento**
    - Generar organizaciones con N reconocimientos aprobados y verificar que el servicio retorna exactamente N entradas por organización
    - Mínimo 100 iteraciones, tag: `Feature: public-recognitions-view, Property 2: Una entrada por reconocimiento`
    - **Valida: Requisitos 1.5**

- [x] 3. Checkpoint — Verificar backend
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Crear query hooks de TanStack Query para el frontend
  - [x] 4.1 Crear query keys y hook `usePublicRecognitions`
    - Crear `apps/web/src/api/query/publicRecognitions/keys.ts` con las query keys
    - Crear `apps/web/src/api/query/publicRecognitions/usePublicRecognitions.ts` con hook que hace `GET` a `public/recognitions` usando `ky` (sin auth token, endpoint público)
    - Crear `apps/web/src/api/query/publicRecognitions/index.ts` con re-exports
    - Modificar `apps/web/src/api/query/index.ts` para agregar `export * from "./publicRecognitions"`
    - _Requisitos: 1.1, 5.1_

- [x] 5. Implementar la pantalla de transparencia
  - [x] 5.1 Crear el componente `TransparencyScreen`
    - Crear `apps/web/src/screens/Transparency/TransparencyScreen.tsx` con:
      - Hook `usePublicRecognitions` para obtener datos
      - Hook `useFuzzySearch` con keys `["organizationName"]` para búsqueda difusa
      - Tres selectores de filtro: BadgeType, año, rubro (opciones derivadas de valores únicos en los datos)
      - Componente `StylizedDataGrid` con 4 columnas: organización, tipo de reconocimiento, año, rubro
      - Estados de carga (indicador visible), vacío (mensaje), y error (mensaje + botón reintentar)
      - Filtrado conjuntivo: cada fila visible satisface TODOS los filtros activos
    - Crear `apps/web/src/screens/Transparency/index.ts` con re-export
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4_

  - [x] 5.2 Integrar con la ruta existente
    - Modificar `apps/web/src/routes/transparency.tsx` para reemplazar `UnderConstructionScreen` por `TransparencyScreen`
    - _Requisitos: 6.1, 6.2, 6.3, 6.4_

  - [x]\* 5.3 Escribir tests de renderizado del frontend
    - Test: TransparencyScreen muestra indicador de carga (Req 5.1)
    - Test: TransparencyScreen muestra mensaje vacío cuando no hay datos (Req 5.2)
    - Test: TransparencyScreen muestra mensaje de error con botón reintentar (Req 5.3)
    - Test: TransparencyScreen renderiza las 4 columnas esperadas (Req 2.1)
    - Test: Los filtros muestran selectores de BadgeType, año y rubro (Req 4.1, 4.2, 4.3)
    - _Requisitos: 7.3_

  - [x]\* 5.4 Escribir test de propiedad: Búsqueda difusa filtra por nombre
    - **Propiedad 3: Búsqueda difusa filtra por nombre de organización**
    - Generar arrays arbitrarios de `PublicRecognitionItem` y queries de búsqueda, verificar que todos los resultados de `useFuzzySearch` son matches difusos del query
    - Mínimo 100 iteraciones, tag: `Feature: public-recognitions-view, Property 3: Búsqueda difusa filtra por nombre`
    - **Valida: Requisitos 3.2**

  - [x]\* 5.5 Escribir test de propiedad: Filtrado conjuntivo
    - **Propiedad 4: Filtrado conjuntivo**
    - Generar arrays arbitrarios de `PublicRecognitionItem` y combinaciones de filtros, verificar que cada fila visible satisface TODOS los filtros activos simultáneamente
    - Mínimo 100 iteraciones, tag: `Feature: public-recognitions-view, Property 4: Filtrado conjuntivo`
    - **Valida: Requisitos 4.4**

  - [x]\* 5.6 Escribir test de propiedad: Opciones de filtro derivadas de los datos
    - **Propiedad 5: Opciones de filtro derivadas de los datos**
    - Generar arrays arbitrarios de `PublicRecognitionItem`, verificar que las opciones de cada selector son exactamente los valores únicos del campo correspondiente (sin duplicados, sin valores ausentes)
    - Mínimo 100 iteraciones, tag: `Feature: public-recognitions-view, Property 5: Opciones de filtro derivadas de los datos`
    - **Valida: Requisitos 4.6**

- [x] 6. Checkpoint final — Verificar integración completa
  - Ensure all tests pass, ask the user if questions arise.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los tests de propiedades usan `fast-check` con mínimo 100 iteraciones
- El endpoint es público (`config: { public: true }`), no requiere autenticación
- El filtrado es client-side dado el bajo volumen de datos (POC)
