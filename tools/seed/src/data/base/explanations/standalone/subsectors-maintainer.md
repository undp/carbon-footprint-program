# Mantenedor de Actividades Económicas

## Objetivo

Permite gestionar el catálogo de Actividades Económicas, el segundo nivel de la clasificación de actividad económica. Cada Actividad Económica pertenece a un Sector y permite especializar la descripción de la actividad de una Organización dentro de ese Sector.

Este mantenedor depende del catálogo de Sectores: no se pueden crear Actividades Económicas si no existen Sectores activos. Las Actividades Económicas, a su vez, pueden vincularse a Unidades de Actividad en el Mantenedor de Unidades de Actividad.

## Alcance

- Administra Actividades Económicas con los campos: Sector (obligatorio), Nombre (obligatorio) y Descripción (opcional).
- Las Actividades Económicas pertenecen a un Sector administrado en el Mantenedor de Sectores.
- Solo se ofrecen Sectores **Activos** al asignar el Sector de una Actividad Económica.
- No se gestiona aquí la creación de Sectores ni la asignación de Actividades Económicas a Organizaciones.

## Acciones disponibles

### Crear actividad económica

1. Presionar **Agregar actividad económica**.
2. Se inserta una fila nueva en modo edición al inicio de la tabla; el botón queda deshabilitado si no hay Sectores activos.
3. Seleccionar el **Sector** padre (obligatorio).
4. Completar **Nombre** (obligatorio, hasta 255 caracteres) y, opcionalmente, **Descripción** (hasta 2000 caracteres).
5. Confirmar los cambios para persistir la fila. La Actividad Económica queda en estado **Activo**.

El Nombre debe ser único entre Actividades Económicas activas del mismo Sector.

### Editar actividad económica

1. Hacer clic sobre la fila o presionar el ícono de edición.
2. Modificar **Sector**, **Nombre** y/o **Descripción**.
3. Confirmar para guardar los cambios.

Si la Actividad Económica está en uso por Organizaciones, Unidades de Actividad o Recomendaciones de Subcategorías, se solicitará confirmación antes de aplicar cambios visibles (Nombre o Sector), ya que estos se reflejarán en las entidades que la referencian.

### Eliminar actividad económica

1. Presionar el ícono de eliminar en la fila correspondiente.
2. Se muestra un diálogo que detalla las dependencias activas (Unidades de Actividad, Organizaciones y Recomendaciones de Subcategorías que la referencian).
3. Confirmar la eliminación.

La eliminación es lógica (cambia el estado a **Eliminado**). Las Unidades de Actividad y Recomendaciones de Subcategorías asociadas también se marcan como eliminadas. Las Organizaciones que la tenían asignada conservan la referencia, pero la Actividad Económica deja de ofrecerse en los selectores.

### Restaurar actividad económica

Las Actividades Económicas eliminadas muestran la acción **Restaurar**, que devuelve la Actividad Económica al estado **Activo**. La restauración puede bloquearse si existe un conflicto (por ejemplo, otra Actividad Económica activa con el mismo nombre en el mismo Sector, o que el Sector padre esté eliminado); en ese caso se mostrará el motivo.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Eliminar una Actividad Económica arrastra a las Unidades de Actividad y Recomendaciones de Subcategorías asociadas al estado **Eliminado**. Las Organizaciones que la tenían asignada conservan la referencia histórica, pero la Actividad Económica deja de aparecer en nuevas selecciones. Cambiar el Sector padre de una Actividad Económica en uso reubica la entidad bajo otra jerarquía y afecta búsquedas y agrupaciones existentes.

> ℹ️ **Cuándo modificar**
> Conviene crear, renombrar o reasignar una Actividad Económica cuando se ajusta la taxonomía sectorial del país o cuando se requiere mayor granularidad bajo un Sector existente.

> 🚫 **Cuándo NO modificar**
> Evitar renombrar una Actividad Económica para representar otra categoría distinta: cambia su significado en reportes históricos. En esos casos, eliminar la Actividad Económica existente y crear una nueva. Tampoco mover una Actividad Económica a otro Sector si eso rompe la coherencia con las Organizaciones que ya la tenían asignada bajo el Sector original.
