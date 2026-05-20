# Mantenedor de Recomendaciones de Sub-categorías

## Objetivo

Esta pantalla administra el catálogo de Recomendaciones de Sub-categorías: el conjunto de Sub-categorías que se pre-seleccionan automáticamente al crear un inventario, en función del Rubro y Subrubro de la Organización. Su propósito es orientar a las organizaciones hacia las fuentes de emisión más relevantes para su actividad, sin reemplazar la decisión final del usuario al definir el alcance del inventario.

Las recomendaciones se administran dentro del contexto de una versión de Metodología y se agrupan por la combinación (Rubro, Subrubro). Es válido también recomendar para un Rubro completo sin especificar Subrubro.

## Alcance

- Permite gestionar grupos de recomendación con los siguientes campos: Metodología, Rubro, Subrubro (opcional) y conjunto de Sub-categorías recomendadas.
- Los Rubros y Subrubros provienen del Mantenedor de Rubros y del Mantenedor de Subrubros respectivamente. Las Sub-categorías que se pueden recomendar son las definidas para la Metodología seleccionada en el Mantenedor de Sub-categorías.
- No se modifican desde aquí las Sub-categorías, los Rubros ni los Subrubros: esta pantalla únicamente vincula entidades existentes.

## Acciones disponibles

### Crear recomendación

1. Hacer clic en "Agregar recomendación" en el encabezado. Solo se admite una fila nueva a la vez.
2. Seleccionar el Rubro (obligatorio) y, opcionalmente, el Subrubro. Si no se especifica un Subrubro, la recomendación aplica a "Todos los subrubros" del Rubro.
3. Abrir el selector de Sub-categorías y elegir al menos una.
4. Guardar la fila con la acción de confirmación.

Validaciones:

| Campo          | Reglas                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Metodología    | Obligatoria. Se toma del selector de metodología del encabezado.                                                                                                               |
| Rubro          | Obligatorio.                                                                                                                                                                   |
| Subrubro       | Opcional. Si se omite, la recomendación aplica al Rubro completo.                                                                                                              |
| Sub-categorías | Al menos una Sub-categoría seleccionada.                                                                                                                                       |
| Unicidad       | No puede existir más de una recomendación activa para la misma combinación de Metodología, Rubro y Subrubro. Si ya existe, el sistema lo indica y se debe editar la existente. |

### Editar recomendación

1. Hacer clic sobre la fila para abrir el selector de Sub-categorías.
2. Ajustar el conjunto seleccionado mediante la lista de transferencia y guardar.
3. Guardar la fila para persistir los cambios.

Los campos Rubro y Subrubro son inmutables tras la creación: para cambiar el grupo de destino se debe eliminar la recomendación y crear una nueva.

### Eliminar recomendación

1. Usar la acción de eliminar sobre la fila, o vaciar la selección de Sub-categorías al guardar.
2. El sistema solicita confirmación explícita antes de eliminar todas las recomendaciones del grupo.
3. Tras confirmar, el grupo se elimina lógicamente y deja de aplicar a inventarios futuros.

### Cambiar de Metodología

Si existen cambios sin guardar al cambiar el selector de Metodología, el sistema solicita confirmación para descartarlos. Solo después de confirmar se recargan los datos del nuevo contexto.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Las recomendaciones se aplican en el momento de crear un inventario; no afectan inventarios ya creados, líneas existentes ni reportes emitidos. Modificar o eliminar una recomendación únicamente cambia la sugerencia inicial que verán los próximos usuarios al iniciar la captura.

> ℹ️ **Cuándo modificar**
> Lo habitual es ajustar este mantenedor al incorporar nuevos Rubros o Subrubros, al detectar que un sector productivo recibe sugerencias incompletas o desactualizadas, o cuando una nueva versión de la Metodología introduce Sub-categorías relevantes para una actividad económica determinada.

> 🚫 **Cuándo NO modificar**
> Evitar cambios que reduzcan el conjunto recomendado en plena temporada de reporte sin una comunicación adecuada, dado que las organizaciones podrían recibir sugerencias incoherentes con guías o material formativo ya publicado. En caso de duda sobre el impacto operativo, coordinar con el equipo responsable del contenido metodológico antes de aplicar cambios masivos.
