# Mantenedor de Iniciativas para Planes de Reducción

## Objetivo

Esta pantalla administra el catálogo de Iniciativas tipo que las organizaciones pueden seleccionar al armar su Plan de Reducción de emisiones (por ejemplo, cambio a iluminación LED, electrificación de flota, mejora de eficiencia térmica, sustitución de combustibles, recambio de equipos refrigerantes, entre otras).

Cada Iniciativa está asociada a una Sub-categoría dentro de una versión de Metodología, lo que permite ofrecer a las organizaciones un set de iniciativas pertinentes al ámbito de emisiones que están trabajando. Las organizaciones eligen iniciativas desde este catálogo al construir su plan; los planes ya guardados referencian la iniciativa por identificador.

## Alcance

- Permite gestionar Iniciativas con las siguientes columnas: Subcategoría asociada, nombre y descripción.
- Las Iniciativas existen siempre en el contexto de una versión de Metodología, que se selecciona en el encabezado. Por defecto se muestra la Metodología publicada.
- Las Sub-categorías disponibles provienen del Mantenedor de Sub-categorías de la Metodología seleccionada y se muestran agrupadas por Categoría.
- No se administra desde aquí la asignación concreta de iniciativas a organizaciones, ni los planes de reducción específicos de cada inventario.

## Acciones disponibles

### Crear Iniciativa

1. Seleccionar la Metodología sobre la que se desea trabajar en el selector del encabezado.
2. Hacer clic en "Agregar fila". La nueva fila aparece al inicio de la tabla en modo edición.
3. Completar los campos requeridos y confirmar.

Campos y validaciones:

| Columna      | Reglas                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------- |
| Subcategoría | Obligatoria. Debe pertenecer a la Metodología seleccionada. Se elige agrupada por Categoría. |
| Nombre       | Obligatorio. Entre 1 y 120 caracteres. Debe ser único dentro de una misma Sub-categoría.     |
| Descripción  | Obligatoria. Entre 1 y 1000 caracteres.                                                      |

### Editar Iniciativa

Hacer clic sobre la fila para entrar en modo edición y modificar los campos editables. Cambiar la Sub-categoría desplaza la iniciativa a otro ámbito de cálculo, lo que altera el set de organizaciones para las que aparece como sugerencia.

### Eliminar Iniciativa

La operación se realiza como eliminación lógica: la Iniciativa queda marcada como eliminada y deja de mostrarse como opción en nuevos planes. Los planes ya guardados que la referencian conservan el vínculo.

### Cambiar Metodología en uso

El selector de Metodología en el encabezado permite alternar entre versiones. Si hay cambios sin guardar al cambiar de Metodología, el sistema solicita confirmación para descartarlos antes de continuar.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Los planes de reducción ya creados por organizaciones referencian las iniciativas por identificador. Renombrar el título o reescribir la descripción de una Iniciativa altera lo que ven las organizaciones que ya la habían seleccionado. Eliminar una Iniciativa la retira del catálogo, pero los planes históricos conservan el vínculo y deben revisarse caso a caso si fuese necesario actualizarlos.

> ℹ️ **Cuándo modificar**
> Lo habitual es agregar nuevas iniciativas a medida que aparecen tecnologías o prácticas relevantes en el contexto del país, o cuando se incorpora una nueva versión de Metodología que abre Sub-categorías no cubiertas. También es útil corregir descripciones poco claras detectadas en uso real.

> 🚫 **Cuándo NO modificar**
> No se recomienda eliminar Iniciativas ampliamente utilizadas por organizaciones en planes vigentes. Tampoco cambiar la Sub-categoría asociada a una Iniciativa en uso, ya que altera el ámbito de cálculo asociado a la decisión que tomaron las organizaciones cuando la seleccionaron.
