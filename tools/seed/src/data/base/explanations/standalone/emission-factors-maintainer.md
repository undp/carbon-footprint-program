# Mantenedor de Factores de Emisión

## Objetivo

Esta pantalla administra el catálogo de Factores de Emisión asociados a una versión de Metodología. Un Factor de Emisión es el valor numérico que convierte una unidad de actividad (combustible quemado, energía consumida, distancia recorrida, kilogramos de residuos, etc.) en una cantidad equivalente de CO₂eq, y constituye la pieza central del cálculo de huella de carbono.

Cada Factor está asociado a una Sub-categoría, una Unidad de Medida de tasa, una fuente bibliográfica o regulatoria y un desglose por GEI (CO₂ fósil, CH₄, N₂O, HFC, PFC, SF₆, NF₃). Cuando la Sub-categoría lo requiere, también se asocia a valores de Dimensiones que afinan el factor según el contexto (por ejemplo, tipo de combustible, mix energético, región).

## Alcance

- Permite gestionar Factores de Emisión con las siguientes columnas: Sub-categoría, Variable 1 y Variable 2 (cuando la Sub-categoría las requiere), Valor, Unidad, Desglose GEI y Fuente.
- Los Factores existen siempre dentro del contexto de una versión de Metodología, que se selecciona en el encabezado.
- Las opciones de Sub-categoría, Unidad de Medida y valores de Dimensión provienen de los mantenedores correspondientes (Sub-categorías, Unidades de Medida de Tasa, Dimensiones de Factores de Emisión).
- No se administra desde aquí la definición de Sub-categorías, Dimensiones ni Unidades de Medida; sólo la asociación de valores numéricos.

## Acciones disponibles

### Crear Factor de Emisión

1. Hacer clic en "Agregar fila" en el encabezado. La nueva fila aparece al inicio de la tabla en modo edición.
2. Completar los campos requeridos y confirmar.

Campos y validaciones:

| Columna       | Reglas                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sub-categoría | Obligatoria. Debe pertenecer a la Metodología activa en el selector.                                                                                                                       |
| Variable 1    | Obligatoria si la Sub-categoría declara una primera dimensión requerida; deshabilitada (no aplica) en otro caso.                                                                           |
| Variable 2    | Obligatoria si la Sub-categoría declara una segunda dimensión requerida; deshabilitada (no aplica) en otro caso.                                                                           |
| Valor         | Obligatorio. Número no negativo y distinto de 0.                                                                                                                                           |
| Unidad        | Obligatoria. Debe corresponder a una unidad de tasa compatible con la Sub-categoría.                                                                                                       |
| Desglose GEI  | Valores no negativos por gas (CO₂ fósil, CH₄, N₂O, HFC, PFC, SF₆, NF₃). Se edita en un modal.                                                                                              |
| Fuente        | Obligatoria. Texto libre con la referencia bibliográfica o regulatoria del factor. Todos los Factores activos de una misma Sub-categoría deben compartir la Fuente dentro de un mismo Año. |
| Año           | Obligatorio. Año de huella para el que el Factor es válido. El selector ofrece desde cuatro años atrás hasta el próximo. Una huella sólo recibe Factores de su mismo año.                  |

### Editar Factor de Emisión

Hacer clic sobre la fila para entrar en modo edición y modificar los campos editables. El desglose por GEI se edita en un modal dedicado al que se accede desde la propia fila.

Sólo puede editarse un Factor que ninguna línea de huella esté usando. Un Factor en uso queda inerte en la tabla —no entra en modo edición y no ofrece eliminar— e indica cuántas líneas dependen de él. Esto vale igual en la Metodología activa y en una versión anterior: lo que decide no es el estado de la versión, sino si alguna línea vigente apunta al Factor.

### Eliminar Factor de Emisión

La operación se realiza como eliminación lógica: el Factor queda marcado como eliminado y deja de mostrarse en los listados activos.

Rige la misma regla que para editar: un Factor que alguna línea vigente esté usando no puede eliminarse. Las líneas de huellas anteriores que lo usaron y luego cambiaron a otro Factor no lo bloquean, porque ya no dependen de él.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Los Factores de Emisión son la base del cálculo de huella, y por eso un Factor deja de ser modificable en cuanto alguna línea de huella lo usa. Mientras nadie lo use puede corregirse libremente, incluso en la Metodología activa: un Factor recién agregado es corregible hasta que una huella lo tome.
>
> La consecuencia a tener presente es la contraria a la habitual: un Factor cargado con un valor equivocado que ya esté en uso no se puede arreglar desde esta pantalla. Conviene revisar el valor, la fuente y el desglose antes de guardar.

> ℹ️ **Cuándo modificar**
> Lo habitual es agregar Factores nuevos cuando el regulador del país publica actualizaciones de los factores oficiales, cuando se incorpora una nueva fuente bibliográfica o cuando una nueva versión de Metodología requiere ampliar la cobertura.

> 🚫 **Sobre duplicar la Metodología**
> Duplicar la Metodología y publicar una versión nueva no alcanza a las huellas que ya existen: cada huella queda ligada a la versión que estaba activa cuando se creó, y esa ligadura no cambia. La versión nueva sólo la usarán las huellas creadas después.
>
> Por eso, para que una huella en curso disponga de un Factor que le falta, ese Factor tiene que entrar en la versión que esa huella ya referencia —normalmente la activa—. Agregar Factores a la Metodología activa es una operación normal y prevista; duplicar sirve para cambiar la estructura de la Metodología, no para llegar a huellas existentes.
