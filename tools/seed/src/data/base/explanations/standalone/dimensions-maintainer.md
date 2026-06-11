# Mantenedor de Dimensiones / Variables

## Objetivo

Las dimensiones representan los ejes mediante los cuales se diferencia un factor de emisión dentro de una subcategoría (por ejemplo: tipo de combustible, tecnología vehicular, región geográfica). Cada dimensión agrupa una lista de variables, que son los valores concretos que puede tomar ese eje.

Este mantenedor permite definir, por subcategoría, hasta dos dimensiones y sus variables asociadas. Las combinaciones de variables son las que luego utilizan los factores de emisión para discriminar el valor que corresponde aplicar a cada captura de inventario.

## Alcance

- Dimensiones de una subcategoría: nombre, posición (1 o 2) y obligatoriedad. Cada subcategoría admite como máximo dos dimensiones.
- Variables asociadas a cada dimensión, gestionadas en el modal "Configurar Variables — \<nombre\>".
- La vista opera siempre dentro de una metodología seleccionada. En metodologías marcadas como de solo lectura los datos se muestran sin opciones de edición ni acciones.
- Búsqueda por nombre de dimensión y nombre de subcategoría desde la barra superior de la tabla.
- No se gestionan en esta pantalla: categorías, subcategorías, factores de emisión ni capturas de emisión que consumen estas dimensiones.

## Acciones disponibles

### Crear dimensión

Usa "Agregar fila" para insertar una nueva dimensión. La fila se prepara para edición y se deben completar:

- **Sub-categoría**: obligatoria, se elige del listado agrupado por categoría. Una subcategoría no puede tener más de dos dimensiones.
- **Nombre**: obligatorio.
- **Requerido**: marca si la dimensión debe completarse en cada captura.
- **Variables**: se abren con el botón "Editar". Debe haber al menos una variable y sus nombres no pueden estar vacíos ni duplicados.

La posición (1 o 2) se asigna automáticamente según las dimensiones existentes en la subcategoría seleccionada.

### Editar dimensión

Al hacer clic en una fila se habilita su edición. Se pueden modificar el nombre, la marca de obligatorio y la lista de variables (agregar, renombrar o eliminar). La subcategoría y la posición no son editables después de la creación. Si la subcategoría ya tiene factores de emisión activos, el indicador de "Requerido" queda bloqueado.

### Eliminar dimensión

Desde el botón de acciones se puede eliminar una dimensión, con confirmación que advierte de la eliminación de todos los factores de emisión asociados. Si la subcategoría tiene dos dimensiones, solo se permite eliminar la posición 2; la posición 1 únicamente puede eliminarse cuando es la única de la subcategoría.

### Gestionar variables

El botón "Editar" (o "Ver" en modo lectura) abre el modal de variables. Permite agregar, renombrar y eliminar entradas. Cuando la subcategoría ya tiene factores de emisión activos, se permiten altas y renombramientos, pero no eliminaciones de variables existentes.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Eliminar una dimensión elimina en cascada todas sus variables y los factores de emisión que las referencian (relación con borrado en cascada en base de datos). Renombrar variables conserva su identidad y se propaga a todas las referencias. Cambiar la obligatoriedad afecta la validación de capturas futuras pero no las ya registradas.

> ℹ️ **Cuándo modificar**
> Cuando una metodología requiere agregar un nuevo eje de diferenciación para una subcategoría, cuando se necesita ajustar nombres para mayor claridad, o cuando se incorporan nuevas variables que extienden la cobertura de los factores de emisión.

> 🚫 **Cuándo NO modificar**
> No eliminar variables ni dimensiones que estén siendo referenciadas por factores de emisión o capturas activas si no existe un plan de migración. No usar este mantenedor para introducir terminología específica de un país: las dimensiones deben permanecer coherentes con la metodología, y las particularidades locales se modelan mediante seeds y parámetros de configuración en otras capas.
