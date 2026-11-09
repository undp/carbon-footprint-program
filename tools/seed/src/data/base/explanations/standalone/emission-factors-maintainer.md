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

| Columna       | Reglas                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sub-categoría | Obligatoria. Debe pertenecer a la Metodología activa en el selector.                                                                                                                                                                                                                                                                                                                                                  |
| Variable 1    | Obligatoria si la Sub-categoría declara una primera dimensión requerida; deshabilitada (no aplica) en otro caso.                                                                                                                                                                                                                                                                                                      |
| Variable 2    | Obligatoria si la Sub-categoría declara una segunda dimensión requerida; deshabilitada (no aplica) en otro caso.                                                                                                                                                                                                                                                                                                      |
| Valor         | Obligatorio. Número no negativo y distinto de 0.                                                                                                                                                                                                                                                                                                                                                                      |
| Unidad        | Obligatoria. Debe corresponder a una unidad de tasa compatible con la Sub-categoría.                                                                                                                                                                                                                                                                                                                                  |
| Desglose GEI  | Valores no negativos por gas (CO₂ fósil, CH₄, N₂O, HFC, PFC, SF₆, NF₃). Se edita en un modal.                                                                                                                                                                                                                                                                                                                         |
| Fuente        | Obligatoria. Texto libre con la referencia bibliográfica o regulatoria del factor. Una Sub-categoría puede usar varias Fuentes en un mismo Año. No puede haber dos Factores activos con la misma Sub-categoría, Variables, Fuente y Año; las Fuentes que solo difieren en mayúsculas o espacios cuentan como la misma. Si una misma actividad tiene Factores de dos Fuentes, quien captura su huella elige cuál usar. |
| Año           | Obligatorio. Año de huella para el que el Factor es válido. El selector ofrece desde cuatro años atrás hasta el próximo. Una huella sólo recibe Factores de su mismo año.                                                                                                                                                                                                                                             |

### Editar Factor de Emisión

Hacer clic sobre la fila para entrar en modo edición y modificar los campos editables. El desglose por GEI se edita en un modal dedicado al que se accede desde la propia fila.

Sólo puede editarse un Factor que ninguna fuente de emisión de una huella esté usando. Un Factor en uso queda inerte en la tabla —no entra en modo edición y no ofrece eliminar— e indica cuántas fuentes de emisión dependen de él. Esto vale igual en la Metodología activa y en una versión anterior: lo que decide no es el estado de la versión, sino si alguna fuente de emisión vigente apunta al Factor.

### Eliminar Factor de Emisión

La operación se realiza como eliminación lógica: el Factor queda marcado como eliminado y deja de mostrarse en los listados activos.

Rige la misma regla que para editar: un Factor que alguna fuente de emisión vigente esté usando no puede eliminarse. Las fuentes de emisión de huellas anteriores que lo usaron y luego cambiaron a otro Factor no lo bloquean, porque ya no dependen de él.

### Copiar factores de un año

Carga el catálogo de un año nuevo a partir del de otro año, en una sola operación. Se abre con "Copiar factores" en el encabezado, sólo en modo edición, y trabaja sobre la versión de Metodología que se está editando.

1. Elegir el año de **Origen** (los años que ya tienen Factores) y el de **Destino**.
2. Revisar la tabla: hay una fila por cada Factor del año de origen. En cada una pueden corregirse la **Fuente** y el **Valor** que tendrá la copia; los números se escriben con coma decimal, como en la tabla de Factores. Un Factor que no corresponde copiar se quita con el ícono de eliminar y se recupera con la flecha circular.
3. Hacer clic en "Copiar N factores a [año]".

Se puede usar de dos maneras:

- **En la Metodología activa.** Lo copiado queda disponible de inmediato para las huellas del año de destino, también para las que ya están en curso.
- **En una versión duplicada**, que se publica después. Lo copiado sólo llega a las huellas creadas tras publicarla.

Qué se copia y qué no:

- Se copia cada Factor del año de origen con su Sub-categoría, Variables, Unidad y desglose GEI, y con la Fuente y el Valor de la fila.
- Un Factor cuya fila ya existe en el año de destino (misma Sub-categoría, Variables y Unidad, con cualquier Fuente o Valor) no se copia ni se sobrescribe: aparece bloqueado. Así, copiar dos veces no duplica nada y copiar a un año a medio cargar sólo completa lo que falta.
- Un Factor con desglose GEI se copia con su Valor, que no puede cambiarse en la copia: si cambia, se corrige después en la tabla de Factores junto con el desglose.
- El año de origen no cambia.

Qué impide copiar y qué sólo avisa:

- **Impide copiar:** una Fuente o un Valor vacíos, y dos Factores que quedarían en la misma fila con la misma Fuente (las Fuentes que sólo difieren en mayúsculas o espacios cuentan como la misma). La celda marcada explica el motivo.
- **Sólo avisa:** un Valor que cambia más de un 25 % respecto del año de origen, o que es 10 veces mayor o menor (suele ser un error de unidad). La fila lo muestra junto al valor de origen y el pie cuenta las alertas.

La copia es atómica: se crean todos los Factores o ninguno. Si otra persona carga Factores en el año de destino al mismo tiempo, la copia se rechaza sin escribir nada y basta con volver a intentarla.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Los Factores de Emisión son la base del cálculo de huella, y por eso un Factor deja de ser modificable en cuanto alguna fuente de emisión de una huella lo usa. Mientras nadie lo use puede corregirse libremente, incluso en la Metodología activa: un Factor recién agregado es corregible hasta que una huella lo tome.
>
> La consecuencia a tener presente es la contraria a la habitual: un Factor cargado con un valor equivocado que ya esté en uso no se puede arreglar desde esta pantalla. Conviene revisar el valor, la fuente y el desglose antes de guardar.

> ℹ️ **Cuándo modificar**
> Lo habitual es agregar Factores nuevos cuando el regulador del país publica actualizaciones de los factores oficiales, cuando se incorpora una nueva fuente bibliográfica o cuando una nueva versión de Metodología requiere ampliar la cobertura.

> 🚫 **Sobre duplicar la Metodología**
> Duplicar la Metodología y publicar una versión nueva no alcanza a las huellas que ya existen: cada huella queda ligada a la versión que estaba activa cuando se creó, y esa ligadura no cambia. La versión nueva sólo la usarán las huellas creadas después.
>
> Por eso, para que una huella en curso disponga de un Factor que le falta, ese Factor tiene que entrar en la versión que esa huella ya referencia —normalmente la activa—. Agregar Factores a la Metodología activa es una operación normal y prevista; duplicar sirve para cambiar la estructura de la Metodología, no para llegar a huellas existentes.
