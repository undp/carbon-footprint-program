# Mantenedor de Metodologías

## Objetivo

Esta pantalla administra el catálogo de Metodologías de cálculo de huella de carbono disponibles en el país (por ejemplo, enfoques basados en ISO 14064, GHG Protocol u otros marcos normativos). Cada Metodología define el conjunto de Categorías, Sub-categorías y Factores de Emisión sobre los cuales se levantan los inventarios.

Las Metodologías existen en versiones administradas: cada fila representa una versión específica con su propio nombre, regulación, versión y estado. En todo momento debe existir una y sólo una Metodología activa (publicada), que es la que se utiliza por defecto al crear nuevos inventarios.

## Alcance

- Permite gestionar versiones de Metodología con los siguientes campos: nombre, descripción, regulación, versión y estado de publicación.
- Cada Metodología agrupa Categorías, Sub-categorías, Dimensiones y Factores de Emisión que se administran en sus mantenedores específicos. Desde esta pantalla se accede a esos mantenedores en el contexto de la Metodología seleccionada.
- También expone acceso a la exportación a Excel de la estructura completa de una Metodología y a su duplicación como base para una nueva versión.
- No se modifican desde aquí las Categorías, Sub-categorías ni Factores de Emisión: cada uno tiene su propio mantenedor.

## Acciones disponibles

### Crear Metodología

1. Hacer clic en "Agregar fila" en el encabezado. La nueva fila aparece al inicio de la tabla en modo edición.
2. Completar los campos requeridos y confirmar.

Campos y validaciones:

| Campo       | Reglas                                                          |
| ----------- | --------------------------------------------------------------- |
| Nombre      | Obligatorio. Entre 1 y 255 caracteres. Único dentro del país.   |
| Descripción | Obligatoria. Entre 1 y 255 caracteres.                          |
| Regulación  | Obligatoria. Entre 1 y 255 caracteres.                          |
| Versión     | Obligatoria. Entre 1 y 100 caracteres.                          |
| Estado      | Se inicializa como no publicada y se activa con el interruptor. |

### Editar Metodología

Hacer clic sobre la fila para entrar en modo edición y modificar los campos editables. El identificador interno y el país no se modifican desde esta pantalla. Las pantallas asociadas (Categorías, Sub-categorías, Factores de Emisión) se acceden mediante las acciones "Ver" y "Editar" de la fila.

### Activar Metodología

El interruptor de estado activa la Metodología (estado publicada) y desactiva automáticamente la que estuviera publicada previamente. Siempre debe existir una única Metodología activa: el sistema no permite desactivar la activa sin promover otra en su lugar.

### Duplicar Metodología

La acción de duplicar genera una nueva versión a partir de la seleccionada, copiando su estructura completa (Categorías, Sub-categorías, Factores de Emisión, Dimensiones y configuración asociada). La copia se crea como no publicada para permitir ajustes antes de promoverla.

### Exportar a Excel

Cada fila expone una acción para descargar la estructura completa de la Metodología en formato Excel, útil como respaldo o para revisión normativa.

### Eliminar Metodología

La operación se realiza como eliminación lógica: la versión queda marcada como eliminada y deja de mostrarse en los listados activos, pero los inventarios históricos que la referencian conservan su vínculo.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Los inventarios de carbono se asocian a una versión específica de Metodología al momento de su creación. Modificar el nombre, regulación o versión de una Metodología en uso cambia la forma en que se identifica en reportes históricos. Eliminar una Metodología referenciada por inventarios puede dejar inconsistente la trazabilidad normativa, aun cuando los inventarios sigan existiendo.

> ℹ️ **Cuándo modificar**
> Lo habitual es agregar una nueva versión cuando el regulador del país publica una actualización normativa, o cuando se requiere introducir un nuevo enfoque metodológico. La opción de duplicar facilita construir la nueva versión a partir de una existente y publicarla cuando esté lista.

> 🚫 **Cuándo NO modificar**
> No se recomienda alterar el nombre, regulación o versión de una Metodología ya utilizada en inventarios reconocidos o reportados externamente: conviene crear una nueva versión en lugar de mutar la actual. Tampoco eliminar versiones referenciadas por inventarios históricos, ya que afecta la trazabilidad de los cálculos publicados.
