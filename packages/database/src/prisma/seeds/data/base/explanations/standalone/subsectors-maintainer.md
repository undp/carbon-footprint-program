# Mantenedor de Subrubros

## Objetivo

Permite gestionar el catálogo de Subrubros, el segundo nivel de la clasificación de actividad económica. Cada Subrubro pertenece a un Rubro y permite especializar la descripción de la actividad de una Organización dentro de ese Rubro.

Este mantenedor depende del catálogo de Rubros: no se pueden crear Subrubros si no existen Rubros activos. Los Subrubros, a su vez, pueden vincularse a Actividades Principales en el Mantenedor de Actividades Principales.

## Alcance

- Administra Subrubros con los campos: Rubro (obligatorio), Nombre (obligatorio) y Descripción (opcional).
- Los Subrubros pertenecen a un Rubro administrado en el Mantenedor de Rubros.
- Solo se ofrecen Rubros **Activos** al asignar el Rubro de un Subrubro.
- No se gestiona aquí la creación de Rubros ni la asignación de Subrubros a Organizaciones.

## Acciones disponibles

### Crear subrubro

1. Presionar **Agregar subrubro**.
2. Se inserta una fila nueva en modo edición al inicio de la tabla; el botón queda deshabilitado si no hay Rubros activos.
3. Seleccionar el **Rubro** padre (obligatorio).
4. Completar **Nombre** (obligatorio, hasta 255 caracteres) y, opcionalmente, **Descripción** (hasta 2000 caracteres).
5. Confirmar los cambios para persistir la fila. El Subrubro queda en estado **Activo**.

El Nombre debe ser único entre Subrubros activos del mismo Rubro.

### Editar subrubro

1. Hacer clic sobre la fila o presionar el ícono de edición.
2. Modificar **Rubro**, **Nombre** y/o **Descripción**.
3. Confirmar para guardar los cambios.

Si el Subrubro está en uso por Organizaciones, Actividades Principales o Recomendaciones de Subcategorías, se solicitará confirmación antes de aplicar cambios visibles (Nombre o Rubro), ya que estos se reflejarán en las entidades que lo referencian.

### Eliminar subrubro

1. Presionar el ícono de eliminar en la fila correspondiente.
2. Se muestra un diálogo que detalla las dependencias activas (Actividades Principales, Organizaciones y Recomendaciones de Subcategorías que lo referencian).
3. Confirmar la eliminación.

La eliminación es lógica (cambia el estado a **Eliminado**). Las Actividades Principales y Recomendaciones de Subcategorías asociadas también se marcan como eliminadas. Las Organizaciones que lo tenían asignado conservan la referencia, pero el Subrubro deja de ofrecerse en los selectores.

### Restaurar subrubro

Los Subrubros eliminados muestran la acción **Restaurar**, que devuelve el Subrubro al estado **Activo**. La restauración puede bloquearse si existe un conflicto (por ejemplo, otro Subrubro activo con el mismo nombre en el mismo Rubro, o que el Rubro padre esté eliminado); en ese caso se mostrará el motivo.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Eliminar un Subrubro arrastra a las Actividades Principales y Recomendaciones de Subcategorías asociadas al estado **Eliminado**. Las Organizaciones que lo tenían asignado conservan la referencia histórica, pero el Subrubro deja de aparecer en nuevas selecciones. Cambiar el Rubro padre de un Subrubro en uso reubica la entidad bajo otra jerarquía y afecta búsquedas y agrupaciones existentes.

> ℹ️ **Cuándo modificar**
> Conviene crear, renombrar o reasignar un Subrubro cuando se ajusta la taxonomía sectorial del país o cuando se requiere mayor granularidad bajo un Rubro existente.

> 🚫 **Cuándo NO modificar**
> Evitar renombrar un Subrubro para representar otra categoría distinta: cambia su significado en reportes históricos. En esos casos, eliminar el Subrubro existente y crear uno nuevo. Tampoco mover un Subrubro a otro Rubro si eso rompe la coherencia con las Organizaciones que ya lo tenían asignado bajo el Rubro original.
