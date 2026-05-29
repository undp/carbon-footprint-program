# Mantenedor de Rubros

## Objetivo

Permite gestionar el catálogo de Rubros, la clasificación de actividad económica de mayor nivel que las Organizaciones pueden seleccionar en su perfil. Cada Rubro agrupa Subrubros y Actividades Principales y se utiliza como dimensión transversal en reportes, recomendaciones y segmentación de Organizaciones.

Este mantenedor convive con el Mantenedor de Subrubros y el Mantenedor de Actividades Principales: los tres conforman la jerarquía de perfilamiento sectorial. Cambios realizados aquí impactan las opciones disponibles aguas abajo.

## Alcance

- Administra Rubros con los campos: Nombre (obligatorio) y Descripción (opcional).
- Los Subrubros pertenecen a un Rubro y se administran en el Mantenedor de Subrubros.
- Las Actividades Principales pueden referenciar un Rubro y se administran en el Mantenedor de Actividades Principales.
- No se gestiona aquí la asignación de Rubros a Organizaciones: eso ocurre en el perfil de cada Organización.

## Acciones disponibles

### Crear rubro

1. Presionar **Agregar rubro**.
2. Se inserta una fila nueva en modo edición al inicio de la tabla.
3. Completar **Nombre** (obligatorio, hasta 255 caracteres) y, opcionalmente, **Descripción** (hasta 2000 caracteres).
4. Confirmar los cambios para persistir la fila. El Rubro queda en estado **Activo**.

El Nombre debe ser único entre Rubros activos del país.

### Editar rubro

1. Hacer clic sobre la fila o presionar el ícono de edición.
2. Modificar **Nombre** y/o **Descripción**. Ambos son editables en cualquier momento.
3. Confirmar para guardar los cambios.

Si el Rubro está en uso por Organizaciones, Subrubros, Actividades Principales o Recomendaciones de Subcategorías, se solicitará confirmación antes de aplicar cambios visibles (como el Nombre), ya que estos se reflejarán en las entidades que lo referencian.

### Eliminar rubro

1. Presionar el ícono de eliminar en la fila correspondiente.
2. Se muestra un diálogo que detalla las dependencias activas (Subrubros, Actividades Principales, Organizaciones y Recomendaciones de Subcategorías que lo referencian).
3. Confirmar la eliminación.

La eliminación es lógica (cambia el estado a **Eliminado**); el registro permanece en la base para preservar el historial. Los Subrubros, Actividades Principales y Recomendaciones de Subcategorías asociadas también se marcan como eliminados. Las Organizaciones que lo tenían asignado conservan la referencia, pero el Rubro deja de ofrecerse en los selectores.

### Restaurar rubro

Los Rubros eliminados muestran la acción **Restaurar**, que devuelve el Rubro al estado **Activo**. La restauración puede bloquearse si existe un conflicto (por ejemplo, otro Rubro activo con el mismo nombre); en ese caso se mostrará el motivo.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Eliminar un Rubro arrastra a los Subrubros, Actividades Principales y Recomendaciones de Subcategorías asociadas al estado **Eliminado**. Las Organizaciones que lo tenían asignado conservan la referencia histórica, pero el Rubro deja de aparecer en nuevas selecciones. Renombrar un Rubro en uso cambia la etiqueta mostrada en todas las entidades que lo referencian.

> ℹ️ **Cuándo modificar**
> Conviene crear, renombrar o ajustar la descripción de un Rubro cuando se incorporan nuevas clasificaciones definidas por el regulador o cuando se necesita reordenar el catálogo para reflejar la realidad sectorial del país.

> 🚫 **Cuándo NO modificar**
> Evitar renombrar un Rubro para representar otra categoría distinta: cambia su significado en reportes históricos. En esos casos, eliminar el Rubro existente y crear uno nuevo. Tampoco eliminar Rubros que sigan siendo válidos solo porque están en desuso temporal.
