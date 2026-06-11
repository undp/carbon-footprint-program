# Mantenedor de Categorías

## Objetivo

Esta pantalla administra el catálogo de Categorías (también referidas como Alcances) asociadas a una versión de Metodología. Cada Categoría agrupa el conjunto de Sub-categorías sobre las cuales se levantan las líneas de inventario y los Factores de Emisión, por lo que constituye la columna vertebral de la estructura de cálculo de huella en la plataforma.

Las Categorías existen siempre dentro del contexto de una Metodología específica y se muestran en un orden definido por su posición. Ese orden afecta cómo se presentan en otros mantenedores y en las pantallas de captura, por lo que mantenerlo consistente con la normativa del país y con la metodología es parte del trabajo del administrador.

## Alcance

- Permite gestionar Categorías con las siguientes columnas: posición, ícono (con su color), categoría/alcance, nombre, descripción y explicación extendida (texto enriquecido opcional).
- Cada Categoría está asociada a una versión de Metodología administrada en el Mantenedor de Metodologías. El selector de metodología en el encabezado define sobre cuál versión se está trabajando.
- Las Sub-categorías que dependen de cada Categoría se administran por separado, en el Mantenedor de Sub-categorías.
- No se modifica desde aquí la estructura general de Metodologías ni las Sub-categorías vinculadas.

## Acciones disponibles

### Crear Categoría

1. Hacer clic en "Agregar fila" en el encabezado. La nueva fila aparece al inicio de la tabla en modo edición.
2. Completar los campos requeridos y guardar la fila.

Campos y validaciones:

| Columna           | Reglas                                                                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pos.              | Define el orden de la categoría. Número entero mayor a 0, único dentro de la metodología. Se ajusta con las acciones de mover hacia arriba/abajo, no se escribe a mano. |
| Ícono             | Obligatorio. Se elige un ícono válido del catálogo y su color (código hexadecimal) desde el selector de ícono de la fila.                                               |
| Categoría/Alcance | Obligatoria. Denominación del alcance o categoría que se muestra en captura y reportes.                                                                                 |
| Nombre            | Obligatorio. Entre 1 y 255 caracteres. Debe ser único dentro de la versión de metodología.                                                                              |
| Descripción       | Obligatoria. Texto breve que describe la categoría.                                                                                                                     |
| Explicación       | Opcional. Texto enriquecido extendido que se gestiona desde el editor asociado a la fila (botón Agregar/Editar/Ver).                                                    |

### Editar Categoría

1. Hacer clic sobre la fila para entrar en modo edición.
2. Modificar los campos editables y confirmar los cambios desde los controles de la fila.

Todos los campos descritos son editables. El identificador interno y la metodología a la que pertenece la categoría no se modifican desde esta pantalla.

### Eliminar Categoría

1. Usar la acción de eliminar en la fila correspondiente.
2. La operación se realiza como eliminación lógica: la categoría queda marcada como eliminada y deja de mostrarse en los listados activos.

Por configuración de la base de datos, las Sub-categorías asociadas se ven afectadas por esta operación. Por su impacto en datos históricos, conviene revisar las advertencias de la sección "Consideraciones" antes de eliminar.

### Reordenar Categorías

Cada fila expone acciones para moverla hacia arriba o hacia abajo. El cambio se aplica intercambiando la posición con la fila vecina y se persiste de inmediato. Las filas nuevas que aún no han sido guardadas no pueden participar en un reordenamiento.

### Editar explicación extendida

Cada fila expone un acceso a un editor de explicación enriquecida (markdown). El contenido se guarda asociado a la Categoría y puede usarse para entregar contexto adicional a quienes consultan o capturan información en pantallas relacionadas.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Las Sub-categorías, Factores de Emisión, líneas de inventarios históricos y otros artefactos cuelgan estructuralmente de las Categorías. Eliminar o renombrar una Categoría existente puede afectar la interpretación de inventarios y reportes ya emitidos. Cambiar la posición es seguro respecto del cálculo, pero modifica el orden visible en captura y reportes.

> ℹ️ **Cuándo modificar**
> Lo habitual es ajustar este mantenedor durante el onboarding de una nueva metodología, al incorporar una versión que requiere un nuevo alcance o ante un cambio normativo del regulador del país que reorganiza los alcances de emisiones.

> 🚫 **Cuándo NO modificar**
> No se recomienda eliminar Categorías que ya hayan sido utilizadas en inventarios reportados o reconocidos. Tampoco modificar el nombre o la semántica de una Categoría existente si esto cambia el significado de información histórica: en esos casos, conviene crear una nueva versión de la Metodología en lugar de alterar la actual.
