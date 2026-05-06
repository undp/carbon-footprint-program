# categorias-emisiones

## Qué contiene

Fichas educativas a **nivel de Alcance / Categoría** de la metodología de medición de huella de carbono, basadas en ISO 14064-1:2018 y GHG Protocol. Cada archivo introduce el alcance, lista sus sub-categorías, da preguntas de auto-diagnóstico para que el usuario identifique si le aplica, y guía el ingreso de datos en el calculador.

## Archivos clave

| Archivo                                                            | Descripción                                                                               | Notas                 |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------- |
| [alcance-1-emisiones-directas.md](alcance-1-emisiones-directas.md) | Emisiones directas: combustiones estacionarias, móviles, fugitivas, procesos industriales | Overview de Alcance 1 |
| [alcance-2-energia-importada.md](alcance-2-energia-importada.md)   | Emisiones indirectas por electricidad y energía térmica comprada                          | Overview de Alcance 2 |
| [alcance-3-otras-indirectas.md](alcance-3-otras-indirectas.md)     | Emisiones indirectas de la cadena de valor — Categorías 3, 4, 5 y 6 de ISO 14064          | Overview de Alcance 3 |

## Sub-carpetas

| Carpeta                          | Descripción                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------- |
| [subcategorias/](subcategorias/) | Fichas a nivel sub-categoría (otras fuentes A1 + 8 sub-categorías de Alcance 3) |

## Estructura común de cada ficha

1. **Título + definición breve** (1-2 líneas)
2. **🔥 Sección expandida** con tabla de sub-categorías incluidas
3. **📘 Preguntas clave** para auto-diagnóstico
4. **💡 Tip** de decisión
5. **¿Cómo es el cálculo?** — fórmula general (CO₂eq = Cantidad × Factor)
6. **🧭 Paso a paso** (4 pasos: identificar → recolectar → estimar → ingresar)
7. **📌 Ejemplo práctico** numérico
8. **📝 Notas importantes** — límites con otros scopes

## Pendientes / próximas iteraciones

- Sub-categorías de Alcance 1 todavía no cubiertas: combustiones estacionarias (existe el ejemplo de referencia externo), combustiones móviles, fugitivas (refrigerantes), procesos industriales
- Sub-categorías de Alcance 2: electricidad comprada (detalle), vapor/calor/frío comprado
- Validación con especialista GEI antes de publicar a producción
- Sincronización de factores de emisión con la fuente oficial de la plataforma

## Advertencias

- Los **factores de emisión** mostrados en ejemplos son referenciales y no oficiales del año en curso. Verificar contra la fuente oficial de la plataforma antes de publicar.
- El contenido está orientado a los **4 países objetivo del proyecto: Perú, Chile, Ecuador, República Dominicana**. Las referencias específicas (distribuidoras, monedas, aeropuertos, couriers, sistemas eléctricos) corresponden a estos 4 mercados.
- Los ejemplos numéricos usan distintos países dentro de los 4 para mostrar variabilidad por matriz energética.
