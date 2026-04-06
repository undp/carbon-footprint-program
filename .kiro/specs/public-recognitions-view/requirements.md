# Documento de Requisitos — Vista Pública de Reconocimientos

## Introducción

Vista pública de solo lectura que muestra las organizaciones registradas en la plataforma Huella Latam junto con los sellos o reconocimientos que han obtenido. Cualquier visitante del sitio web puede consultar esta tabla, filtrar por reconocimiento, año o rubro, y buscar organizaciones por nombre con búsqueda difusa. La vista reemplaza la pantalla "En Construcción" actualmente asignada a la ruta `/transparency`.

## Glosario

- **Sistema**: La aplicación Huella Latam (backend API + frontend web)
- **API_Pública**: Endpoint HTTP público (`GET /api/public/recognitions`) que no requiere autenticación
- **Vista_Transparencia**: Pantalla frontend accesible en la ruta `/transparency`
- **Tabla_Reconocimientos**: Componente de tabla (basado en MUI DataGrid) que muestra las filas de reconocimientos
- **Buscador**: Campo de texto con búsqueda difusa (Fuse.js) para encontrar organizaciones por nombre
- **Filtros**: Controles de selección para filtrar filas por tipo de reconocimiento, año y rubro
- **Organización**: Entidad registrada en la plataforma con datos legales y comerciales (modelo `Organization` + `OrganizationData`)
- **Reconocimiento**: Sello o badge otorgado a una organización tras la aprobación de una solicitud (modelo `Badge` vinculado a `Submission` con estado APPROVED)
- **Rubro**: Sector económico de la organización (campo `name` del modelo `CountrySector`)
- **Año**: Año del inventario de carbono asociado al reconocimiento (campo `year` del modelo `CarbonInventory`)
- **BadgeType**: Enumeración que define los tipos de reconocimiento: ORGANIZATION_ACCREDITATION, CARBON_INVENTORY_CALCULATION, CARBON_INVENTORY_VERIFICATION, REDUCTION_PLAN_VERIFICATION, NEUTRALIZATION_PLAN_VERIFICATION

## Requisitos

### Requisito 1: Endpoint público de reconocimientos

**User Story:** Como visitante del sitio web, quiero acceder a los datos de reconocimientos sin necesidad de autenticación, para poder consultar qué organizaciones están registradas y qué sellos han obtenido.

#### Criterios de Aceptación

1. THE API_Pública SHALL exponer un endpoint `GET /api/public/recognitions` con la opción de configuración `public: true` para omitir autenticación
2. WHEN la API_Pública recibe una solicitud válida, THE API_Pública SHALL responder con un arreglo de objetos que contengan: nombre de la organización, tipo de reconocimiento (BadgeType), año del reconocimiento y nombre del rubro
3. THE API_Pública SHALL retornar únicamente reconocimientos vinculados a solicitudes (Submission) con estado APPROVED
4. THE API_Pública SHALL retornar únicamente organizaciones con estado ACTIVE
5. WHEN una organización tiene múltiples reconocimientos aprobados, THE API_Pública SHALL retornar una entrada separada por cada reconocimiento de esa organización
6. IF la API_Pública no encuentra reconocimientos aprobados, THEN THE API_Pública SHALL retornar un arreglo vacío con código HTTP 200
7. THE API_Pública SHALL validar la respuesta con un esquema Zod definido en `@repo/types`

### Requisito 2: Tabla de reconocimientos

**User Story:** Como visitante del sitio web, quiero ver una tabla con las organizaciones y sus reconocimientos, para poder identificar rápidamente qué empresas están registradas y qué sellos han obtenido.

#### Criterios de Aceptación

1. THE Tabla_Reconocimientos SHALL mostrar las siguientes columnas: nombre de la organización, tipo de reconocimiento, año del reconocimiento y rubro de la organización
2. WHEN una organización tiene más de un reconocimiento, THE Tabla_Reconocimientos SHALL mostrar una fila separada por cada reconocimiento de esa organización
3. THE Tabla_Reconocimientos SHALL utilizar el componente MUI DataGrid existente en el proyecto (patrón StylizedDataGrid)
4. THE Vista_Transparencia SHALL ser una vista de solo lectura sin acciones de escritura ni edición

### Requisito 3: Búsqueda difusa por nombre de organización

**User Story:** Como visitante del sitio web, quiero buscar organizaciones por nombre con tolerancia a errores de escritura, para poder encontrar empresas aunque no recuerde el nombre exacto.

#### Criterios de Aceptación

1. THE Buscador SHALL proporcionar un campo de texto para ingresar el nombre de la organización
2. WHEN el visitante ingresa texto en el Buscador, THE Buscador SHALL filtrar las filas de la Tabla_Reconocimientos utilizando búsqueda difusa con el hook `useFuzzySearch` existente (basado en Fuse.js)
3. WHEN el Buscador está vacío, THE Tabla_Reconocimientos SHALL mostrar todas las filas disponibles (aplicando solo los Filtros activos)
4. THE Buscador SHALL ejecutar la búsqueda sobre el campo nombre de la organización

### Requisito 4: Filtros por reconocimiento, año y rubro

**User Story:** Como visitante del sitio web, quiero filtrar la tabla por tipo de reconocimiento, año y rubro, para poder encontrar organizaciones que cumplan criterios específicos.

#### Criterios de Aceptación

1. THE Filtros SHALL incluir un selector para filtrar por tipo de reconocimiento (BadgeType)
2. THE Filtros SHALL incluir un selector para filtrar por año del reconocimiento
3. THE Filtros SHALL incluir un selector para filtrar por rubro (nombre del CountrySector)
4. WHEN el visitante selecciona un valor en cualquier Filtro, THE Tabla_Reconocimientos SHALL mostrar únicamente las filas que coincidan con todos los Filtros activos simultáneamente
5. WHEN ningún Filtro está seleccionado, THE Tabla_Reconocimientos SHALL mostrar todas las filas disponibles
6. THE Filtros SHALL poblar las opciones disponibles a partir de los valores únicos presentes en los datos retornados por la API_Pública

### Requisito 5: Estados de carga, vacío y error

**User Story:** Como visitante del sitio web, quiero recibir retroalimentación visual clara mientras los datos se cargan o si ocurre un error, para entender el estado actual de la página.

#### Criterios de Aceptación

1. WHILE los datos se están cargando desde la API_Pública, THE Vista_Transparencia SHALL mostrar un indicador de carga visible
2. WHEN la API_Pública retorna un arreglo vacío, THE Vista_Transparencia SHALL mostrar un mensaje indicando que no se encontraron reconocimientos
3. IF la solicitud a la API_Pública falla, THEN THE Vista_Transparencia SHALL mostrar un mensaje de error descriptivo con opción de reintentar
4. WHEN los filtros o la búsqueda no producen resultados, THE Tabla_Reconocimientos SHALL mostrar un mensaje indicando que no hay resultados para los criterios seleccionados

### Requisito 6: Integración con la ruta existente

**User Story:** Como visitante del sitio web, quiero acceder a la vista de transparencia desde el menú de navegación del landing, para poder encontrar la página de reconocimientos fácilmente.

#### Criterios de Aceptación

1. THE Vista_Transparencia SHALL reemplazar el componente `UnderConstructionScreen` en la ruta `/transparency`
2. THE Vista_Transparencia SHALL mantener la ruta `Routes.TRANSPARENCY` ya definida en `routes.const.ts` sin modificaciones
3. THE Vista_Transparencia SHALL ser accesible desde el enlace "Transparencia" en el header del landing sin requerir autenticación
4. THE Sistema SHALL preservar todas las rutas existentes sin modificaciones

### Requisito 7: Tests mínimos

**User Story:** Como desarrollador, quiero contar con tests mínimos que validen el comportamiento básico del endpoint y la vista, para asegurar que la funcionalidad no se rompa con cambios futuros.

#### Criterios de Aceptación

1. THE Sistema SHALL incluir al menos un test unitario para el servicio del endpoint que valide que retorna datos correctos para reconocimientos aprobados
2. THE Sistema SHALL incluir al menos un test unitario para el servicio del endpoint que valide que excluye reconocimientos no aprobados
3. THE Sistema SHALL incluir al menos un test de renderizado para la Vista_Transparencia que valide que los estados de carga, vacío y error se muestran correctamente
