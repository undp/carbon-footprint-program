# subcategorias

## Qué contiene

Fichas educativas a **nivel de sub-categoría** de la metodología de medición de huella de carbono, dirigidas al usuario final del calculador. Cada ficha cubre una fuente específica de emisión, con definición, preguntas clave, fórmula, paso a paso e ingreso en plataforma.

Las fichas siguen exactamente el template del ejemplo de referencia "Combustiones estacionarias" pasado por el cliente: definición breve → expandida → preguntas clave → tip → fórmula → paso a paso (4 pasos con casos novato/experto/solo-total) → ejemplo numérico → notas.

## Archivos clave

### Alcance 1

| Archivo                                                  | Descripción                                                                                                |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [alcance-1-otras-fuentes.md](alcance-1-otras-fuentes.md) | Fuentes residuales dentro de los límites físicos (ganadería, RILes, compostaje, fertilizantes, extintores) |

### Alcance 3

| Archivo                                                                                            | Descripción                                                                          |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [alcance-3-commuting-y-trabajo-remoto.md](alcance-3-commuting-y-trabajo-remoto.md)                 | Desplazamiento diario empleados + trabajo desde casa (WFH)                           |
| [alcance-3-otras-fuentes.md](alcance-3-otras-fuentes.md)                                           | Fuentes residuales fuera del control operativo (inversiones, franquicias, arriendos) |
| [alcance-3-productos-comprados.md](alcance-3-productos-comprados.md)                               | Bienes y servicios adquiridos (materias primas, equipos, servicios, agua)            |
| [alcance-3-transporte-distribucion-downstream.md](alcance-3-transporte-distribucion-downstream.md) | Transporte de productos terminados desde la empresa hasta clientes (vía terceros)    |
| [alcance-3-transporte-distribucion-upstream.md](alcance-3-transporte-distribucion-upstream.md)     | Transporte de insumos desde proveedores hasta la empresa (vía terceros)              |
| [alcance-3-uso-productos-vendidos.md](alcance-3-uso-productos-vendidos.md)                         | Emisiones durante la vida útil de los productos vendidos                             |
| [alcance-3-viajes-estadia.md](alcance-3-viajes-estadia.md)                                         | Alojamiento durante viajes laborales (hoteles, Airbnb, piezas arrendadas)            |
| [alcance-3-viajes-traslado.md](alcance-3-viajes-traslado.md)                                       | Transporte en viajes laborales (avión, bus, tren, taxi, rent-a-car)                  |

## Estructura común de cada ficha

1. **Título + definición breve** (1-2 líneas)
2. **🔥/🚌/📦/✈️ Sección expandida** con detalle del alcance (emoji varía por categoría)
3. **📘 Preguntas clave** para auto-diagnóstico
4. **💡 Tip** de decisión
5. **¿Cómo es el cálculo?** — fórmula específica + tabla de factores referenciales
6. **🧭 Paso a paso** (4 pasos: identificar → recolectar → estimar → ingresar)
7. **📌 Ejemplo práctico** con cifras
8. **📝 Notas importantes** — caveats, límites con otras sub-categorías

## Pendientes / próximas iteraciones

Sub-categorías de Alcance 1 todavía no cubiertas (faltarían):

- Combustiones estacionarias (existe ya el ejemplo de referencia externo, no replicado en KB)
- Combustiones móviles
- Emisiones fugitivas (refrigerantes)
- Procesos industriales

Sub-categorías de Alcance 2 todavía no cubiertas:

- Electricidad comprada (detalle)
- Vapor / calor / frío comprado

## Advertencias

- **Factores de emisión** mostrados son **referenciales**. Sincronizar con la fuente oficial de la plataforma antes de publicar.
- Contenido orientado a los **4 países objetivo del proyecto**: Perú, Chile, Ecuador, República Dominicana. Distribuidoras eléctricas, couriers, aeropuertos, monedas y factores específicos a estos 4 mercados.
- Validación con **especialista en GEI** recomendada antes de publicar a producción.
- Algunos detalles de UI (campos como "Fuente factor", "Factor kgCO₂/unidad", checkbox "Sólo quiero ingresar el total de emisiones") asumen consistencia con el calculador — verificar al integrar.
