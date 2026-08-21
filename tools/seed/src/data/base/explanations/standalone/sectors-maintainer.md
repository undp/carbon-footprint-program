# Mantenedor de Sectores

## Objetivo

Permite gestionar el catálogo de Sectores, la clasificación de actividad económica de mayor nivel que las Organizaciones pueden seleccionar en su perfil. Cada Sector agrupa Actividades Económicas y Unidades de Actividad y se utiliza como dimensión transversal en reportes, recomendaciones y segmentación de Organizaciones.

Este mantenedor convive con el Mantenedor de Actividades Económicas y el Mantenedor de Unidades de Actividad: los tres conforman la jerarquía de clasificación económica. Cambios realizados aquí impactan las opciones disponibles aguas abajo.

## Alcance

- Administra Sectores con los campos: Nombre (obligatorio) y Descripción (opcional).
- Las Actividades Económicas pertenecen a un Sector y se administran en el Mantenedor de Actividades Económicas.
- Las Unidades de Actividad pueden referenciar un Sector y se administran en el Mantenedor de Unidades de Actividad.
- No se gestiona aquí la asignación de Sectores a Organizaciones: eso ocurre en el perfil de cada Organización.

## Acciones disponibles

### Crear sector

1. Presionar **Agregar sector**.
2. Se inserta una fila nueva en modo edición al inicio de la tabla.
3. Completar **Nombre** (obligatorio, hasta 255 caracteres) y, opcionalmente, **Descripción** (hasta 2000 caracteres).
4. Confirmar los cambios para persistir la fila. El Sector queda en estado **Activo**.

El Nombre debe ser único entre Sectores activos del país.

### Editar sector

1. Hacer clic sobre la fila o presionar el ícono de edición.
2. Modificar **Nombre** y/o **Descripción**. Ambos son editables en cualquier momento.
3. Confirmar para guardar los cambios.

Si el Sector está en uso por Organizaciones, Actividades Económicas, Unidades de Actividad o Recomendaciones de Subcategorías, se solicitará confirmación antes de aplicar cambios visibles (como el Nombre), ya que estos se reflejarán en las entidades que lo referencian.

### Eliminar sector

1. Presionar el ícono de eliminar en la fila correspondiente.
2. Se muestra un diálogo que detalla las dependencias activas (Actividades Económicas, Unidades de Actividad, Organizaciones y Recomendaciones de Subcategorías que lo referencian).
3. Confirmar la eliminación.

La eliminación es lógica (cambia el estado a **Eliminado**); el registro permanece en la base para preservar el historial. Las Actividades Económicas, Unidades de Actividad y Recomendaciones de Subcategorías asociadas también se marcan como eliminadas. Las Organizaciones que lo tenían asignado conservan la referencia, pero el Sector deja de ofrecerse en los selectores.

### Restaurar sector

Los Sectores eliminados muestran la acción **Restaurar**, que devuelve el Sector al estado **Activo**. La restauración puede bloquearse si existe un conflicto (por ejemplo, otro Sector activo con el mismo nombre); en ese caso se mostrará el motivo.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Eliminar un Sector arrastra a las Actividades Económicas, Unidades de Actividad y Recomendaciones de Subcategorías asociadas al estado **Eliminado**. Las Organizaciones que lo tenían asignado conservan la referencia histórica, pero el Sector deja de aparecer en nuevas selecciones. Renombrar un Sector en uso cambia la etiqueta mostrada en todas las entidades que lo referencian.

> ℹ️ **Cuándo modificar**
> Conviene crear, renombrar o ajustar la descripción de un Sector cuando se incorporan nuevas clasificaciones definidas por el regulador o cuando se necesita reordenar el catálogo para reflejar la realidad sectorial del país.

> 🚫 **Cuándo NO modificar**
> Evitar renombrar un Sector para representar otra categoría distinta: cambia su significado en reportes históricos. En esos casos, eliminar el Sector existente y crear uno nuevo. Tampoco eliminar Sectores que sigan siendo válidos solo porque están en desuso temporal.
