# Mantenedor de Sub-categorías

## Objetivo

Esta pantalla administra el catálogo de Sub-categorías asociadas a las Categorías de una versión de Metodología. Las Sub-categorías son el nivel sobre el cual se levantan las líneas de inventario, se asocian Factores de Emisión y se ofrecen recomendaciones de captura por sector, por lo que constituyen una pieza central de la operación del sistema.

Cada Sub-categoría se enmarca dentro de una Categoría y declara las Unidades de Medida válidas para registrar consumos o actividad. La pantalla opera en el contexto de la versión de Metodología seleccionada en el encabezado y permite editar el conjunto completo de manera tabular.

## Alcance

- Permite gestionar Sub-categorías con los siguientes campos: Categoría a la que pertenecen, nombre, ícono, descripción, explicación extendida (texto enriquecido opcional) y Unidades de Medida asociadas.
- Las Sub-categorías pertenecen a una Categoría administrada en el Mantenedor de Categorías. Si una Categoría requerida no existe, debe crearse previamente en ese mantenedor.
- Las Unidades de Medida disponibles para asociar provienen del Mantenedor de Unidades de Medida.
- Los Factores de Emisión, Dimensiones y Recomendaciones de Sub-categoría se administran en sus propias pantallas; no se gestionan desde aquí.

## Acciones disponibles

### Crear Sub-categoría

1. Hacer clic en "Agregar fila" en el encabezado. La nueva fila aparece al inicio de la tabla en modo edición.
2. Completar los campos requeridos y guardar la fila.

Campos y validaciones:

| Campo              | Reglas                                                                               |
| ------------------ | ------------------------------------------------------------------------------------ |
| Categoría          | Obligatoria. Debe seleccionarse una Categoría existente de la metodología actual.    |
| Nombre             | Obligatorio. Entre 1 y 255 caracteres. Debe ser único dentro de la Categoría.        |
| Ícono              | Obligatorio. Debe corresponder a un ícono válido del catálogo.                       |
| Descripción        | Obligatoria. Texto breve que describe la sub-categoría.                              |
| Explicación        | Opcional. Texto enriquecido extendido gestionado desde el editor asociado a la fila. |
| Unidades de Medida | Lista de unidades válidas para esta sub-categoría. No se admiten duplicados.         |

### Editar Sub-categoría

1. Hacer clic sobre la fila para entrar en modo edición.
2. Modificar los campos editables y confirmar los cambios desde los controles de la fila.

Son editables la Categoría a la que pertenece, el nombre, el ícono, la descripción, la explicación y el listado de Unidades de Medida asociadas. El identificador interno no se modifica desde esta pantalla.

### Eliminar Sub-categoría

1. Usar la acción de eliminar en la fila correspondiente.
2. La operación se realiza como eliminación lógica: la sub-categoría queda marcada como eliminada y deja de mostrarse en los listados activos.

Antes de eliminar conviene revisar la sección "Consideraciones": la Sub-categoría puede tener Factores de Emisión, Dimensiones, recomendaciones por sector y líneas de inventarios históricos vinculadas.

### Editar explicación extendida

Cada fila expone un acceso a un editor de explicación enriquecida (markdown). El contenido se guarda asociado a la Sub-categoría y se utiliza para entregar contexto adicional en pantallas de captura y consulta.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Las Sub-categorías son referenciadas por Factores de Emisión, Dimensiones de Factor de Emisión, Líneas de Inventario, iniciativas del Plan de Reducción, Proyectos de Reducción y Recomendaciones por sector. Eliminar una Sub-categoría puede orfanear Factores de Emisión y dejar datos de inventarios históricos sin referencia activa visible. Cambiar la Categoría asociada o el nombre afecta cómo se agrupan y reportan datos ya capturados.

> ℹ️ **Cuándo modificar**
> Es apropiado intervenir este mantenedor durante el onboarding de la metodología, al incorporar nuevas fuentes de emisión derivadas de la normativa del país, o cuando se requiere ajustar la lista de Unidades de Medida válidas para una sub-categoría existente.

> 🚫 **Cuándo NO modificar**
> No eliminar ni renombrar Sub-categorías que ya hayan sido utilizadas en inventarios reportados, reconocimientos emitidos o reportes públicos. Para cambios estructurales de fondo, se sugiere generar una nueva versión de la Metodología en lugar de modificar la actual.
