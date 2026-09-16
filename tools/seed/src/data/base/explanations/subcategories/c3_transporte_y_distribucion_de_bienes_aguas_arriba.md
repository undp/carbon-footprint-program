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

Misma lógica que el transporte downstream:

> $CO₂e$ = $Peso\ transportado \times Distancia \times Factor\ por\ modo$

(unidad estándar: **ton-km**)

| Modo de transporte          | Factor referencial           |
| :-------------------------- | :--------------------------- |
| Camión liviano (<3,5 ton)   | 0,25 kg CO₂e/ton-km          |
| Camión pesado (>16 ton)     | 0,07 kg CO₂e/ton-km          |
| Tren de carga               | 0,03 kg CO₂e/ton-km          |
| Marítimo (contenedores)     | 0,015 kg CO₂e/ton-km         |
| Aéreo (carga internacional) | 0,5 kg CO₂e/ton-km           |
| Refrigerado (cold chain)    | +30-50% sobre el factor base |

💡 El **modo aéreo** es por lejos el más intensivo: ~30x más que marítimo.

### 🔑 La duda que produce los errores más grandes

**¿Sumo todos los pesos y todas las distancias, y después multiplico?**

**No.** El ton-km se calcula **viaje por viaje** y después se suman los ton-km:

> ✅ **Correcto:** $Cantidad$ = $\sum_{viajes} (peso\ del\ viaje \times distancia\ del\ viaje)$
>
> ❌ **Incorrecto:** $(\sum peso) \times (\sum distancia)$

La forma incorrecta multiplica cada kilo por kilómetros que ese kilo nunca recorrió, y el resultado se infla varias veces. En el ejemplo del final, hacerlo así da **casi 6 veces** la cantidad real.

💡 Sí puedes agrupar viajes que comparten la misma ruta: si hiciste 8 envíos de 0,25 ton por los mismos 1.400 km, calcula $0,25 \times 1.400 = 350$ ton-km y multiplícalo por 8. Lo que no se puede es usar **una** distancia contra el peso total cuando las rutas son distintas.

### 🧮 La fórmula práctica para obtener la cantidad

> Por cada ruta o modo:
> $ton\text{-}km\ de\ la\ ruta$ = $peso\ por\ viaje\ (ton) \times distancia\ del\ viaje\ (km) \times N°\ de\ viajes$
>
> Y la cantidad de la línea es la **suma** de los ton-km de las rutas que comparten modo y sub-modo.

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

- **Peso total recibido** (kg o ton) por origen
- **Distancia** desde el origen (geo-distancia o real)
- **Modo** de transporte

---

### 3️⃣ Si no tienes el dato exacto

#### **Opción 1:** Distancia geográfica entre origen y destino

Usa Google Maps o calculadora de rutas marítimas/aéreas para estimar la distancia.

_Ejemplo:_ Insumo importado desde Asia hasta un puerto sudamericano = **~19.000 km marítimo**.

---

#### **Opción 2:** Estimación por modo asumido

Si compras a un proveedor en otra ciudad del mismo país (ej. distancia ~500 km), puedes estimar:

> 1 envío × peso × ~500 km × factor camión pesado

---

#### **Opción 3:** Si compras CIF

Si tu incoterm es CIF (Cost, Insurance, Freight), el flete está incluido en el precio del proveedor — el proveedor a veces puede entregar el detalle.

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir las cantidades**

Debes rellenar los siguientes campos:

| Campo              | Qué debes ingresar                                                                      |                                     Ejemplo |
| :----------------- | :-------------------------------------------------------------------------------------- | ------------------------------------------: |
| Modo de transporte | Tipo de transporte                                                                      |            Terrestre, Aéreo, Marítimo, Tren |
| Sub-modo           | Detalle                                                                                 | Camión liviano, Carga marítima, Carga aérea |
| Unidad             | Unidad declarada                                                                        |                               ton-km, kg-km |
| Cantidad           | Suma de los ton-km de cada viaje del año (peso del viaje × distancia del viaje, sumado) |                              190.000 ton-km |

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

- **Tela desde Asia**, vía marítima, 19.000 km por viaje: **4 embarques de 2,5 ton** cada uno
- **Hilados desde un país vecino**, camión pesado, 1.400 km por viaje: **8 viajes de 0,25 ton** cada uno
- **Equipos importados**, vía aérea, 7.000 km: **1 envío de 0,2 ton**

Primero el ton-km **de cada viaje**, y luego el total de la ruta:

| Ruta          | Modo      | Peso por viaje | Distancia | ton-km por viaje | Viajes | ton-km de la ruta |
| :------------ | :-------- | -------------: | --------: | ---------------: | -----: | ----------------: |
| Asia          | Marítimo  |        2,5 ton | 19.000 km |           47.500 |      4 |           190.000 |
| País vecino   | Terrestre |       0,25 ton |  1.400 km |              350 |      8 |             2.800 |
| Internacional | Aéreo     |        0,2 ton |  7.000 km |            1.400 |      1 |             1.400 |

Esos totales de ruta son los que escribes en el campo **Cantidad**, una línea por modo y sub-modo. Después la plataforma calcula las emisiones:

| Ruta          | Modo      | Cantidad (ton-km) | Factor |     Emisiones |
| :------------ | :-------- | ----------------: | -----: | ------------: |
| Asia          | Marítimo  |           190.000 |  0,015 | 2.850 kg CO₂e |
| País vecino   | Terrestre |             2.800 |   0,07 |   196 kg CO₂e |
| Internacional | Aéreo     |             1.400 |    0,5 |   700 kg CO₂e |

**Total sub-categoría: ~3.746 kg CO₂e al año (~3,7 ton CO₂e)**

> ⚠️ **Así se vería el error.** Si sumaras todos los pesos (2,5×4 + 0,25×8 + 0,2 = **12,2 ton**) y todas las distancias (19.000×4 + 1.400×8 + 7.000 = **94.200 km**) y los multiplicaras, obtendrías **1.149.240 ton-km** en vez de los 194.200 reales: casi **6 veces** la cantidad correcta, y una huella igual de inflada. Es el error que más se encuentra al revisar esta sub-categoría.
>
> 💡 Los 200 kg aéreos generan casi tanto como las 10 toneladas marítimas. Para este negocio, **reducir importaciones aéreas** es la mayor palanca.

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en kg CO₂e/ton-km, la cantidad debe estar en ton-km.

---

## 📝 Notas importantes

> - **El ton-km se calcula viaje por viaje** y después se suma. Sumar todos los pesos y todas las distancias para multiplicarlas al final infla la cantidad varias veces
> - **Diferencia clave con Alcance 1:** si transportas insumos con **flota propia**, eso es Alcance 1, no aquí
> - **Diferencia con downstream:** acá entran insumos. Los productos que **salen** de tu empresa hacia clientes van en _Transporte y distribución aguas abajo_
> - **No dupliques con productos comprados:** el factor de "productos comprados" cubre la producción **hasta la puerta del proveedor**. El transporte desde ahí hasta tu empresa va aquí
> - **Aéreo:** factor ~30x mayor que marítimo. Para insumos pesados o volumétricos, conviene marítimo cuando es posible
> - **Cold chain:** insumos refrigerados (alimentos, biotecnología, fármacos) tienen factor mayor
> - **Incoterms:** define con tu proveedor quién paga el flete y de dónde a dónde — ayuda a delimitar lo que reportas
> - **Si compras a un proveedor local pero el insumo viene importado**, idealmente reporta **toda** la cadena de transporte (importación + último tramo)
> - Guarda **BL, AWB, cartas de porte y facturas de flete** como respaldo
