# Mantenedor de Unidades de Actividad

## Objetivo

Permite gestionar el catálogo de Unidades de Actividad: la unidad con la que una Organización mide lo que produce o entrega (toneladas producidas, MWh generados, pasajeros transportados). Es el denominador con el que se calcula la intensidad de la huella —emisiones por unidad de actividad— y se declara en los datos generales de cada Organización. Cada Unidad de Actividad puede asociarse opcionalmente a un Sector y/o a una Actividad Económica, lo que la ubica dentro de la jerarquía de clasificación económica.

Este mantenedor complementa el Mantenedor de Sectores y el Mantenedor de Actividades Económicas. A diferencia de aquellos, una Unidad de Actividad puede existir sin Sector ni Actividad Económica asignada (aplicable de forma transversal).

## Alcance

- Administra Unidades de Actividad con los campos: Sector (opcional), Actividad Económica (opcional), Nombre (obligatorio) y Descripción (opcional).
- Los Sectores y Actividades Económicas referenciados se administran en los Mantenedores de Sectores y de Actividades Económicas respectivamente.
- Solo se ofrecen Sectores y Actividades Económicas **Activos** como opciones; el listado de Actividades Económicas se filtra automáticamente por el Sector seleccionado.
- No se gestiona aquí la asignación de Unidades de Actividad a Organizaciones: eso ocurre en los datos generales de cada Organización.

## Acciones disponibles

### Crear unidad de actividad

1. Presionar **Agregar unidad de actividad**.
2. Se inserta una fila nueva en modo edición al inicio de la tabla.
3. Opcionalmente, seleccionar **Sector** y/o **Actividad Económica**. Al elegir una Actividad Económica, el Sector se completa automáticamente con el Sector padre si no se había definido.
4. Completar **Nombre** (obligatorio, hasta 255 caracteres) y, opcionalmente, **Descripción** (hasta 2000 caracteres).
5. Confirmar los cambios para persistir la fila. La Unidad de Actividad queda en estado **Activo**.

El Nombre debe ser único entre Unidades de Actividad activas con el mismo Sector y Actividad Económica asignados (los valores nulos también participan en la comparación de unicidad).

### Editar unidad de actividad

1. Hacer clic sobre la fila o presionar el ícono de edición.
2. Modificar **Sector**, **Actividad Económica**, **Nombre** y/o **Descripción**. Cambiar el Sector limpia la Actividad Económica si ya no es compatible.
3. Confirmar para guardar los cambios.

Si la Unidad de Actividad está en uso por Organizaciones, se solicitará confirmación antes de aplicar cambios visibles (Nombre, Sector o Actividad Económica), ya que estos se reflejarán en las Organizaciones que la referencian.

### Eliminar unidad de actividad

1. Presionar el ícono de eliminar en la fila correspondiente.
2. Se muestra un diálogo que detalla las Organizaciones que la tienen asignada.
3. Confirmar la eliminación.

La eliminación es lógica (cambia el estado a **Eliminado**). Las Organizaciones que la tenían asignada conservan la referencia, pero la Unidad de Actividad deja de ofrecerse en los selectores.

### Restaurar unidad de actividad

Las Unidades de Actividad eliminadas muestran la acción **Restaurar**, que devuelve el registro al estado **Activo**. La restauración puede bloquearse si existe un conflicto (por ejemplo, otra Unidad de Actividad activa con el mismo nombre bajo el mismo Sector y Actividad Económica, o que el Sector o la Actividad Económica asignada esté eliminada); en ese caso se mostrará el motivo.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Renombrar o reasignar el Sector o la Actividad Económica de una Unidad de Actividad en uso cambia inmediatamente la etiqueta y ubicación en el perfil de las Organizaciones que la referencian. Eliminarla deja a esas Organizaciones con una referencia histórica, pero la Unidad de Actividad ya no aparece como opción seleccionable.

> ℹ️ **Cuándo modificar**
> Conviene crear o ajustar Unidades de Actividad cuando se necesita medir con mayor precisión lo que producen las Organizaciones, o cuando cambia la taxonomía oficial definida por el regulador.

> 🚫 **Cuándo NO modificar**
> Evitar renombrar una Unidad de Actividad para representar otra distinta: rompe la comparabilidad de las intensidades históricas. En esos casos, eliminar la Unidad existente y crear una nueva. Tampoco mover una Unidad a otro Sector o Actividad Económica si las Organizaciones que la usan dejarían de tener sentido bajo la nueva jerarquía.
