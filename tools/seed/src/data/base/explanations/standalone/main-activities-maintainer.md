# Mantenedor de Actividades Principales

## Objetivo

Permite gestionar el catálogo de Actividades Principales: el descriptor más específico de lo que hace una Organización, utilizado durante el perfilamiento y la caracterización inicial. Cada Actividad Principal puede asociarse opcionalmente a un Rubro y/o a un Subrubro, lo que ubica la actividad dentro de la jerarquía sectorial.

Este mantenedor cierra la jerarquía Rubro → Subrubro → Actividad Principal, junto con el Mantenedor de Rubros y el Mantenedor de Subrubros. A diferencia de aquellos, una Actividad Principal puede existir sin Rubro ni Subrubro asignado (clasificación transversal).

## Alcance

- Administra Actividades Principales con los campos: Rubro (opcional), Subrubro (opcional), Nombre (obligatorio) y Descripción (opcional).
- Los Rubros y Subrubros referenciados se administran en los Mantenedores de Rubros y de Subrubros respectivamente.
- Solo se ofrecen Rubros y Subrubros **Activos** como opciones; el listado de Subrubros se filtra automáticamente por el Rubro seleccionado.
- No se gestiona aquí la asignación de Actividades Principales a Organizaciones: eso ocurre durante el perfilamiento de cada Organización.

## Acciones disponibles

### Crear actividad principal

1. Presionar **Agregar actividad**.
2. Se inserta una fila nueva en modo edición al inicio de la tabla.
3. Opcionalmente, seleccionar **Rubro** y/o **Subrubro**. Al elegir un Subrubro, el Rubro se completa automáticamente con el Rubro padre si no se había definido.
4. Completar **Nombre** (obligatorio, hasta 255 caracteres) y, opcionalmente, **Descripción** (hasta 2000 caracteres).
5. Confirmar los cambios para persistir la fila. La Actividad Principal queda en estado **Activo**.

El Nombre debe ser único entre Actividades Principales activas con el mismo Rubro y Subrubro asignados (los valores nulos también participan en la comparación de unicidad).

### Editar actividad principal

1. Hacer clic sobre la fila o presionar el ícono de edición.
2. Modificar **Rubro**, **Subrubro**, **Nombre** y/o **Descripción**. Cambiar el Rubro limpia el Subrubro si ya no es compatible.
3. Confirmar para guardar los cambios.

Si la Actividad Principal está en uso por Organizaciones, se solicitará confirmación antes de aplicar cambios visibles (Nombre, Rubro o Subrubro), ya que estos se reflejarán en las Organizaciones que la referencian.

### Eliminar actividad principal

1. Presionar el ícono de eliminar en la fila correspondiente.
2. Se muestra un diálogo que detalla las Organizaciones que la tienen asignada.
3. Confirmar la eliminación.

La eliminación es lógica (cambia el estado a **Eliminado**). Las Organizaciones que la tenían asignada conservan la referencia, pero la Actividad Principal deja de ofrecerse en los selectores.

### Restaurar actividad principal

Las Actividades Principales eliminadas muestran la acción **Restaurar**, que devuelve el registro al estado **Activo**. La restauración puede bloquearse si existe un conflicto (por ejemplo, otra Actividad Principal activa con el mismo nombre bajo el mismo Rubro y Subrubro, o que el Rubro o Subrubro asignado esté eliminado); en ese caso se mostrará el motivo.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Renombrar o reasignar el Rubro o Subrubro de una Actividad Principal en uso cambia inmediatamente la etiqueta y ubicación en el perfil de las Organizaciones que la referencian. Eliminarla deja a esas Organizaciones con una referencia histórica, pero la Actividad Principal ya no aparece como opción seleccionable.

> ℹ️ **Cuándo modificar**
> Conviene crear o ajustar Actividades Principales cuando se necesita representar de forma más precisa lo que hacen las Organizaciones, o cuando cambia la taxonomía oficial definida por el regulador.

> 🚫 **Cuándo NO modificar**
> Evitar renombrar una Actividad Principal para representar otra distinta: rompe la consistencia de los perfiles históricos. En esos casos, eliminar la Actividad existente y crear una nueva. Tampoco mover una Actividad a otro Rubro o Subrubro si las Organizaciones que la usan dejarían de tener sentido bajo la nueva jerarquía.
