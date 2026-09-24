# 🚛 Transporte y distribución de bienes aguas arriba

Esta sub-categoría incluye las emisiones asociadas al **traslado y distribución de materias primas, productos comprados e insumos** desde tus proveedores hasta las instalaciones de tu empresa, cuando el transporte lo realiza un tercero (proveedor o transportista contratado).

Cubre toda la logística que ocurre **antes** de que los insumos lleguen a tu empresa:

- 🚛 **Camiones de proveedores** que despachan a tu bodega
- ✈️ **Importaciones aéreas** de insumos
- 🚢 **Importaciones marítimas** (contenedores)
- 📦 **Couriers entrantes** (paquetería, equipos comprados)
- 🏬 **Transporte entre bodega del proveedor y la tuya**
- 🚂 **Transporte ferroviario** de carga (donde aplique)

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tus proveedores te **despachan materias primas o insumos**?
- ¿**Importas mercaderías** desde otros países?
- ¿Conoces el **origen geográfico** de tus principales insumos?
- ¿Sabes qué **modo de transporte** usan tus proveedores (camión, avión, barco)?
- ¿Tienes **registros de fletes pagados** o documentos de embarque (BL, AWB)?
- ¿Compras **CIF o FOB** (incoterms)?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

⚠️ Si el transporte se hace con tu **flota propia**, eso va en **Alcance 1 — Combustiones móviles**, no aquí.

---

## ¿Cómo es el cálculo de emisiones?

Misma lógica que el transporte downstream. Lo que ingresas en **Cantidad** depende del transporte, porque cada factor está expresado en una unidad distinta:

| Transporte                                                | Unidad del factor | Qué ingresas en "Cantidad"                                        |
| :-------------------------------------------------------- | :---------------- | :---------------------------------------------------------------- |
| Tren de carga, barco (contenedores o granel), avión       | kg CO₂e/ton-km    | **ton-km**: peso × distancia de cada viaje, sumado                |
| Camión (refrigerado o no), van (eléctrica o a combustión) | kg CO₂e/km        | **km**: distancia recorrida por el vehículo en cada viaje, sumada |

> $CO₂e$ = $Cantidad \times Factor$

En la plataforma, la unidad ton-km aparece como **km-ton**.

| Transporte                       | Factor referencial     |
| :------------------------------- | :--------------------- |
| Camión no refrigerado            | 0,2115 kg CO₂e/km      |
| Camión refrigerado               | 0,2482 kg CO₂e/km      |
| Van con motor a combustión       | 0,06183 kg CO₂e/km     |
| Van eléctrica                    | 0,03758 kg CO₂e/km     |
| Tren de carga                    | 0,02779 kg CO₂e/ton-km |
| Contenedores por barco           | 0,01612 kg CO₂e/ton-km |
| Granel por barco                 | 0,00353 kg CO₂e/ton-km |
| Avión: Short haul (<2500km)      | 0,2051 kg CO₂e/ton-km  |
| Avión: Medium haul (2500-5000km) | 0,1351 kg CO₂e/ton-km  |
| Avión: Long haul (<5000km)       | 0,1351 kg CO₂e/ton-km  |

Fuente: DEFRA 2025. El valor que se aplica a tu huella aparece en el campo **"Factor kgCO₂e/unidad"** al elegir el transporte.

💡 El **modo aéreo** es por lejos el más intensivo por tonelada: su factor es ~8 a 13 veces el del barco en contenedores.

### 🔑 Las dudas que producen los errores más grandes

**Tren, barco o avión: ¿sumo todos los pesos y todas las distancias, y después multiplico?**

**No.** El ton-km se calcula **viaje por viaje** y después se suman los ton-km:

> ✅ **Correcto:** $Cantidad$ = $\sum_{viajes} (peso\ del\ viaje \times distancia\ del\ viaje)$
>
> ❌ **Incorrecto:** $(\sum peso) \times (\sum distancia)$

La forma incorrecta multiplica cada kilo por kilómetros que ese kilo nunca recorrió, y el resultado se infla varias veces. En el ejemplo del final, hacerlo así da **4 veces** la cantidad real.

💡 Sí puedes agrupar viajes que comparten la misma ruta: si hiciste 4 embarques de 2,5 ton por los mismos 19.000 km, calcula $2,5 \times 19.000 = 47.500$ ton-km y multiplícalo por 4. Lo que no se puede es usar **una** distancia contra el peso total cuando las rutas son distintas.

**Camión o van: ¿multiplico los km por el peso?**

**No.** El factor ya corresponde al **vehículo completo**, así que la cantidad son solo los km que recorrió. El peso de la carga no entra en el cálculo.

⚠️ Como el factor asigna a tu empresa todo el viaje, úsalo cuando el vehículo lleva solo tu carga. Si tu carga comparte vehículo con la de otras empresas (courier, carga consolidada), pide al proveedor o transportista el detalle de emisiones de tus envíos.

### 🧮 La fórmula práctica para obtener la cantidad

> Por cada ruta:
>
> - Tren, barco o avión: $ton\text{-}km\ de\ la\ ruta$ = $peso\ por\ viaje\ (ton) \times distancia\ del\ viaje\ (km) \times N°\ de\ viajes$
> - Camión o van: $km\ de\ la\ ruta$ = $distancia\ por\ viaje\ (km) \times N°\ de\ viajes$
>
> Y la cantidad de la línea es la **suma** de las rutas que comparten el mismo transporte.

💡 **Al final de la página hay un ejemplo ilustrativo.**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica el origen de tus insumos principales

Para los insumos que más representan en tu operación:

- ¿De dónde vienen geográficamente?
- ¿Quién los transporta? (proveedor o transportista contratado por ti)
- ¿En qué modo? (terrestre, aéreo, marítimo)

⚠️ Aplica el principio de Pareto: empieza por los **top insumos en peso o gasto**.

---

### 2️⃣ Recolecta los datos

Las fuentes principales:

- **Documentos de embarque:**
  - Bill of Lading (BL) para marítimo
  - Air Waybill (AWB) para aéreo
  - Carta de Porte para terrestre
- **Facturas de flete** (si tu empresa lo paga directamente)
- **Datos del proveedor** (algunos lo informan en sus DDJJ ambientales)
- **ERP / sistema de compras** (peso de mercadería recibida)

Datos mínimos:

- **Transporte** de cada viaje (camión, van, tren, barco o avión)
- **Distancia** de cada viaje desde el origen (geo-distancia o real)
- **Peso** de cada viaje, solo para tren, barco y avión

---

### 3️⃣ Si no tienes el dato exacto

#### **Opción 1:** Distancia geográfica entre origen y destino

Usa Google Maps o calculadora de rutas marítimas/aéreas para estimar la distancia.

_Ejemplo:_ Insumo importado desde Asia hasta un puerto sudamericano = **~19.000 km marítimo**.

---

#### **Opción 2:** Estimación por modo asumido

Si compras a un proveedor en otra ciudad del mismo país (ej. distancia ~500 km), puedes estimar:

> N° de viajes × ~500 km × factor del camión (sin multiplicar por el peso)

---

#### **Opción 3:** Si compras CIF

Si tu incoterm es CIF (Cost, Insurance, Freight), el flete está incluido en el precio del proveedor — el proveedor a veces puede entregar el detalle.

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir las cantidades**

Debes rellenar los siguientes campos:

| Campo      | Qué debes ingresar                                                                                           |                                       Ejemplo |
| :--------- | :----------------------------------------------------------------------------------------------------------- | --------------------------------------------: |
| Transporte | Tipo de transporte                                                                                           | Contenedores por barco, Camión no refrigerado |
| Unidad     | **km-ton** para tren, barco y avión; **km** para camión y van                                                |                                    km-ton, km |
| Cantidad   | Tren, barco y avión: suma de los ton-km de cada viaje. Camión y van: suma de los km recorridos en cada viaje |                     190.000 km-ton, 11.200 km |

⚠️ El campo **"Fuente factor" no debes modificarlo**

⚠️ Si el transporte utilizado no está en la lista, selecciona **Otro** y declara tu propio factor de emisión en **"Fuente factor" → "Otro"**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Rellena los campos igual que en el Caso 1.

2.- En el campo **"Fuente factor"**, selecciona **"Otro"**.

3.- Modifica el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado.

---

**CASO 3:** Hiciste el cálculo por fuera y **ya tienes las emisiones totales de la sub-categoría**

Accede a la calculadora en **modo experto**. En el paso 3, selecciona el checkbox **"Sólo quiero ingresar el total de emisiones"**.

---

### 📌 Ejemplo práctico

Supongamos un **taller textil** que durante el año recibe, en **varios viajes**:

- **Tela desde Asia**, en contenedores por barco, 19.000 km por viaje: **4 embarques de 2,5 ton** cada uno
- **Hilados desde un país vecino**, en camión no refrigerado, 1.400 km por viaje: **8 camiones completos de 10 ton** cada uno
- **Equipos importados**, vía aérea, 7.000 km: **1 envío de 0,2 ton**

Primero la cantidad de cada ruta:

| Ruta          | Transporte                 | Cálculo                        |       Cantidad |
| :------------ | :------------------------- | :----------------------------- | -------------: |
| Asia          | Contenedores por barco     | 2,5 ton × 19.000 km × 4 viajes | 190.000 km-ton |
| País vecino   | Camión no refrigerado      | 1.400 km × 8 viajes            |      11.200 km |
| Internacional | Avión: Long haul (<5000km) | 0,2 ton × 7.000 km × 1 viaje   |   1.400 km-ton |

Esas cantidades son las que escribes en el campo **Cantidad**, una línea por transporte. Después la plataforma calcula las emisiones:

| Ruta          | Transporte                 |       Cantidad |  Factor |     Emisiones |
| :------------ | :------------------------- | -------------: | ------: | ------------: |
| Asia          | Contenedores por barco     | 190.000 km-ton | 0,01612 | 3.063 kg CO₂e |
| País vecino   | Camión no refrigerado      |      11.200 km |  0,2115 | 2.369 kg CO₂e |
| Internacional | Avión: Long haul (<5000km) |   1.400 km-ton |  0,1351 |   189 kg CO₂e |

**Total sub-categoría: ~5.621 kg CO₂e al año (~5,6 ton CO₂e)**

> ⚠️ **Así se vería el error.**
>
> - **Barco:** si sumaras todos los pesos (4 × 2,5 = **10 ton**) y todas las distancias (4 × 19.000 = **76.000 km**) y los multiplicaras, obtendrías **760.000 ton-km** en vez de los 190.000 reales: **4 veces** la cantidad correcta, y una huella igual de inflada. Es el error que más se encuentra al revisar esta sub-categoría.
> - **Camión:** si multiplicaras los km por el peso (11.200 km × 10 ton = **112.000**), la cantidad saldría **10 veces** mayor, porque el factor ya cubre el camión completo.
>
> 💡 Los 8 viajes en camión emiten **tres cuartos** de lo que emiten los 4 embarques desde Asia, con casi 7 veces menos distancia. Para este negocio, **reducir el número de viajes en camión** (camiones llenos, menos despachos) es una palanca tan relevante como el modo.

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en kg CO₂e/ton-km, la cantidad debe estar en ton-km (km-ton en la plataforma). Si está en kg CO₂e/km, la cantidad debe estar en km.

---

## 📝 Notas importantes

> - **En tren, barco y avión, el ton-km se calcula viaje por viaje** y después se suma. Sumar todos los pesos y todas las distancias para multiplicarlas al final infla la cantidad varias veces
> - **En camión y van, la cantidad son los km recorridos**, sin multiplicar por el peso
> - **Diferencia clave con Alcance 1:** si transportas insumos con **flota propia**, eso es Alcance 1, no aquí
> - **Diferencia con downstream:** acá entran insumos. Los productos que **salen** de tu empresa hacia clientes van en _Transporte y distribución aguas abajo_
> - **No dupliques con productos comprados:** el factor de "productos comprados" cubre la producción **hasta la puerta del proveedor**. El transporte desde ahí hasta tu empresa va aquí
> - **Aéreo:** factor ~8 a 13 veces el del barco en contenedores. Para insumos pesados o volumétricos, conviene marítimo cuando es posible
> - **Cold chain:** insumos refrigerados (alimentos, biotecnología, fármacos) tienen factor mayor
> - **Incoterms:** define con tu proveedor quién paga el flete y de dónde a dónde — ayuda a delimitar lo que reportas
> - **Si compras a un proveedor local pero el insumo viene importado**, idealmente reporta **toda** la cadena de transporte (importación + último tramo)
> - Guarda **BL, AWB, cartas de porte y facturas de flete** como respaldo
