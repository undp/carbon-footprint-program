# Mantenedor de Magnitudes

## Objetivo

Las magnitudes representan cantidades medibles asociadas a una dimensión física o abstracta (por ejemplo: distancia recorrida, masa, energía, consumo de combustible). Sirven como agrupador semántico de las unidades de medida: cada unidad concreta pertenece a una magnitud, y solo las unidades de la misma magnitud son convertibles entre sí.

Este mantenedor permite definir las magnitudes disponibles en el sistema y consultar cuántas unidades de medida hacen referencia a cada una.

## Alcance

- Magnitudes del catálogo: código (identificador técnico, p. ej. `vehicles`), nombre legible y cantidad de unidades de medida asociadas.
- Magnitudes marcadas como del sistema (`isSystem`) están protegidas y no pueden modificarse ni eliminarse. La magnitud de masa entra en esta categoría.
- Búsqueda por nombre y código desde la barra superior y exportación del listado.
- No se gestionan en esta pantalla: las unidades de medida (ver "Unidades de medida"), las tasas (ver "Tasas") ni los factores de emisión que las consumen.

## Acciones disponibles

### Crear magnitud

Usa "Agregar magnitud" para insertar una nueva fila. La fila se abre en edición y se deben completar:

- **Código**: obligatorio, en minúsculas, comenzando por una letra y conteniendo solo letras, números o guiones bajos (p. ej. `vehicles`). Hasta 50 caracteres. Debe ser único.
- **Nombre**: obligatorio, hasta 100 caracteres.

Si el código corresponde a una magnitud previamente eliminada, esta se restaura ("Magnitud restaurada exitosamente"); en caso contrario se crea como nueva.

### Editar magnitud

Al hacer clic en una fila se habilita el campo "Nombre". El código no puede modificarse después de la creación (queda con ícono de candado). Las magnitudes del sistema no son editables y se muestran con candado.

### Eliminar magnitud

Desde el botón de acciones se puede eliminar una magnitud cuando no es del sistema y no tiene unidades asociadas (columna "Unidades asociadas" igual a 0). En caso contrario, primero deben eliminarse o reasignarse las unidades que dependen de ella. La acción solicita confirmación.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Las unidades de medida se relacionan con una magnitud mediante una referencia restringida (`onDelete: Restrict`): no es posible eliminar una magnitud que tenga unidades activas. El nombre se usa en pantallas y exportaciones de unidades y tasas, por lo que renombrarla impacta visualmente toda la cadena: unidades, tasas, factores de emisión y capturas que las consumen.

> ℹ️ **Cuándo modificar**
> Cuando se incorpora un nuevo tipo de cantidad medible que aún no existe en el sistema, o cuando se necesita ajustar el nombre por claridad o convención. El flujo recomendado es: crear primero la magnitud y, luego, sus unidades de medida correspondientes desde el mantenedor de unidades.

> 🚫 **Cuándo NO modificar**
> No tocar magnitudes marcadas como del sistema (aparecen con candado). No crear magnitudes específicas de un país: el catálogo debe mantenerse país-agnóstico y las variaciones locales se modelan mediante nuevas unidades de medida dentro de magnitudes existentes.
