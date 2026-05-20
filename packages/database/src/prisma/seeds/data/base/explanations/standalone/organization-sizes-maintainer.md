# Mantenedor de Tamaños de Organización

## Objetivo

Permite gestionar el catálogo de Tamaños que las Organizaciones pueden seleccionar en su perfil (por ejemplo, micro, pequeña, mediana, grande). Cada Tamaño suele definir tramos en función de número de empleados, ingresos u otros criterios establecidos por el regulador, y se utiliza para aplicar metodologías, requisitos o reglas de reporte específicas.

A diferencia de los catálogos sectoriales, los Tamaños tienen un **orden manual**: la posición de las filas define el orden en que las opciones se presentarán a las Organizaciones durante el perfilamiento.

## Alcance

- Administra Tamaños con los campos: Nombre (obligatorio) y Descripción (opcional).
- Cada Tamaño tiene una **posición** que controla el orden de presentación; se ajusta mediante las acciones de mover arriba/abajo.
- No se gestionan aquí los umbrales (empleados, ingresos) ni las reglas de negocio que aplican a cada Tamaño: ese mapeo se define en otras configuraciones del país.

## Acciones disponibles

### Crear tamaño

1. Presionar **Agregar tamaño**.
2. Se inserta una fila nueva en modo edición al inicio de la tabla.
3. Completar **Nombre** (obligatorio, hasta 255 caracteres) y, opcionalmente, **Descripción** (hasta 2000 caracteres).
4. Confirmar los cambios para persistir la fila. El Tamaño queda en estado **Activo** y se ubica al final del orden; usar las acciones de mover para ajustar la posición.

El Nombre debe ser único entre Tamaños activos del país.

### Editar tamaño

1. Hacer clic sobre la fila o presionar el ícono de edición.
2. Modificar **Nombre** y/o **Descripción**.
3. Confirmar para guardar los cambios.

Si el Tamaño está en uso por Organizaciones, se solicitará confirmación antes de aplicar cambios visibles (Nombre), ya que estos se reflejarán en las Organizaciones que lo referencian.

### Reordenar tamaño

Las acciones **Subir** y **Bajar** intercambian la posición del Tamaño con el vecino activo correspondiente. El reordenamiento solo aplica a Tamaños persistidos (no a filas nuevas sin guardar) y a Tamaños en estado **Activo**. El orden definido aquí es el que verán las Organizaciones en sus selectores.

### Eliminar tamaño

1. Presionar el ícono de eliminar en la fila correspondiente.
2. Se muestra un diálogo que detalla cuántas Organizaciones tienen este Tamaño asignado.
3. Confirmar la eliminación.

La eliminación es lógica (cambia el estado a **Eliminado**). Las Organizaciones que lo tenían asignado conservan la referencia, pero el Tamaño deja de ofrecerse en los selectores.

### Restaurar tamaño

Los Tamaños eliminados muestran la acción **Restaurar**, que devuelve el registro al estado **Activo**. La restauración puede bloquearse si existe un conflicto (por ejemplo, otro Tamaño activo con el mismo nombre); en ese caso se mostrará el motivo.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Renombrar un Tamaño en uso cambia inmediatamente la etiqueta mostrada en el perfil de todas las Organizaciones que lo tienen asignado. Eliminarlo deja a esas Organizaciones con una referencia histórica al Tamaño, pero ya no aparecerá como opción seleccionable. Reordenar Tamaños altera la secuencia visible en los selectores y reportes que respetan el orden definido.

> ℹ️ **Cuándo modificar**
> Conviene crear, renombrar o reordenar Tamaños cuando se actualizan los tramos oficiales definidos por el regulador o cuando se quiere homologar la nomenclatura con clasificaciones externas.

> 🚫 **Cuándo NO modificar**
> Evitar renombrar un Tamaño para representar un tramo distinto (por ejemplo, cambiar "Pequeña" por "Mediana"): rompe la consistencia de los perfiles históricos. En esos casos, eliminar el Tamaño existente y crear uno nuevo. Tampoco eliminar Tamaños que aún correspondan a tramos válidos solo por estar poco usados.
