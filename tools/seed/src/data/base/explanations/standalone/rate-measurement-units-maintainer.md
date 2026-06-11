# Mantenedor de Tasas

## Objetivo

Las tasas son unidades compuestas derivadas de dos unidades de medida, expresadas como una razón entre un numerador y un denominador (por ejemplo: kg/L para emisiones por litro de combustible, kWh/km para consumo eléctrico por distancia, kg/m³ para densidades). Se utilizan principalmente para expresar factores de emisión y consumos específicos.

Esta vista es de solo lectura: las tasas se generan a partir de las unidades de medida configuradas en el sistema y se inspeccionan aquí junto a su uso en factores de emisión y fuentes de captura.

## Alcance

- Tasas existentes en el sistema: abreviatura, unidad numerador, unidad denominador y la magnitud de cada componente.
- Conteo de referencias: cuántos factores de emisión de metodologías y cuántas fuentes de emisión en huellas utilizan cada tasa, con desglose por tipo en el tooltip de la columna "Referencias".
- Búsqueda, ordenamiento por columna, paginación y exportación del listado.
- No se gestionan en esta pantalla: la creación, edición o eliminación de tasas, magnitudes, unidades de medida ni factores de emisión.

## Acciones disponibles

### Consultar tasas

La tabla muestra todas las tasas vigentes con las siguientes columnas:

- **Tasa**: abreviatura completa de la razón.
- **Numerador** y **Magnitud (numerador)**: unidad de medida del numerador y la magnitud a la que pertenece.
- **Denominador** y **Magnitud (denominador)**: unidad de medida del denominador y la magnitud a la que pertenece.
- **Referencias**: total de usos. Al posicionar el cursor se despliega el desglose entre "En factores de emisión de metodologías" y "En fuentes de emisión de Huellas".

### Buscar y ordenar

Se puede filtrar el listado mediante la barra de búsqueda y ordenar por cualquier columna. Por defecto, la tabla se ordena por número total de referencias en orden descendente, lo que pone primero las tasas más utilizadas. El tamaño de página se puede ajustar entre 10, 25, 50 y 100 filas.

## Consideraciones

> ⚠️ **Impacto en datos existentes**
> Aunque esta pantalla no permite modificar tasas, los cambios realizados en el mantenedor de "Unidades de medida" se reflejan aquí: alterar o eliminar una unidad referenciada por una tasa puede corromper factores de emisión y, en cascada, los inventarios calculados que dependen de ella. El conteo de referencias visible en esta vista es la mejor referencia para anticipar el impacto antes de tocar las unidades.

> ℹ️ **Cuándo consultar**
> Para entender qué tasas existen actualmente, verificar el nivel de uso de cada una antes de modificar las unidades subyacentes, o diagnosticar inconsistencias entre factores de emisión y fuentes de captura. También para validar que las nuevas combinaciones de unidades requeridas por una metodología ya están disponibles.

> 🚫 **Cuándo NO actuar desde aquí**
> No usar esta vista para intentar gestionar las unidades de medida ni las magnitudes: las correcciones se realizan en sus mantenedores correspondientes. No interpretar la ausencia de una tasa como un error: las tasas se materializan a partir de las combinaciones de unidades efectivamente utilizadas en factores de emisión y capturas.
