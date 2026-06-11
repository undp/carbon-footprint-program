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

| Campo              | Qué debes ingresar |                                     Ejemplo |
| :----------------- | :----------------- | ------------------------------------------: |
| Modo de transporte | Tipo de transporte |            Terrestre, Aéreo, Marítimo, Tren |
| Sub-modo           | Detalle            | Camión liviano, Carga marítima, Carga aérea |
| Unidad             | Unidad declarada   |                               ton-km, kg-km |
| Cantidad           | Total anual        |                              190.000 ton-km |

⚠️ El campo **"Fuente factor" no debes modificarlo**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Rellena los campos igual que en el Caso 1.

2.- En el campo **"Fuente factor"**, selecciona **"Factor propio"**.

3.- Modifica el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado.

---

**CASO 3:** Hiciste el cálculo por fuera y **ya tienes las emisiones totales de la sub-categoría**

Accede a la calculadora en **modo experto**. En el paso 3, selecciona el checkbox **"Sólo quiero ingresar el total de emisiones"**.

---

### 📌 Ejemplo práctico

Supongamos un **taller textil** que durante el año recibe:

- **10 toneladas de tela** importada desde Asia — vía marítima — distancia 19.000 km
- **2 toneladas de hilados** desde un país vecino (vía terrestre, camión pesado) — distancia 1.400 km
- **200 kg de equipos** importados — vía aérea — distancia 7.000 km

Cálculo:

| Origen        | Modo      |    Peso | Distancia |  ton-km | Factor |     Emisiones |
| :------------ | :-------- | ------: | --------: | ------: | -----: | ------------: |
| Asia          | Marítimo  |  10 ton | 19.000 km | 190.000 |  0,015 | 2.850 kg CO₂e |
| País vecino   | Terrestre |   2 ton |  1.400 km |   2.800 |   0,07 |   196 kg CO₂e |
| Internacional | Aéreo     | 0,2 ton |  7.000 km |   1.400 |    0,5 |   700 kg CO₂e |

**Total sub-categoría: ~3.746 kg CO₂e al año (~3,7 ton CO₂e)**

> ⚠️ Los 200 kg aéreos generan casi tanto como las 10 toneladas marítimas. Para este negocio, **reducir importaciones aéreas** es la mayor palanca.

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en kg CO₂e/ton-km, la cantidad debe estar en ton-km.

---

## 📝 Notas importantes

> - **Diferencia clave con Alcance 1:** si transportas insumos con **flota propia**, eso es Alcance 1, no aquí
> - **Diferencia con downstream:** acá entran insumos. Los productos que **salen** de tu empresa hacia clientes van en _Transporte y distribución aguas abajo_
> - **No dupliques con productos comprados:** el factor de "productos comprados" cubre la producción **hasta la puerta del proveedor**. El transporte desde ahí hasta tu empresa va aquí
> - **Aéreo:** factor ~30x mayor que marítimo. Para insumos pesados o volumétricos, conviene marítimo cuando es posible
> - **Cold chain:** insumos refrigerados (alimentos, biotecnología, fármacos) tienen factor mayor
> - **Incoterms:** define con tu proveedor quién paga el flete y de dónde a dónde — ayuda a delimitar lo que reportas
> - **Si compras a un proveedor local pero el insumo viene importado**, idealmente reporta **toda** la cadena de transporte (importación + último tramo)
> - Guarda **BL, AWB, cartas de porte y facturas de flete** como respaldo
