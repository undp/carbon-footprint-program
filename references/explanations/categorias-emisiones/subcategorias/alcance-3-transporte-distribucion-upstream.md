# Transporte y distribución de bienes aguas arriba

Emisiones asociadas al **traslado y distribución de materias primas, productos comprados e insumos** desde tus proveedores hasta las instalaciones de tu empresa.

## 🚛 Transporte y distribución aguas arriba (upstream)

Esta sub-categoría incluye toda la logística que ocurre **antes** de que los insumos lleguen a tu empresa, cuando el transporte lo realiza un tercero (proveedor o transportista contratado).

Cubre:

- 🚛 **Camiones de proveedores** que despachan a tu bodega
- ✈️ **Importaciones aéreas** de insumos
- 🚢 **Importaciones marítimas** (contenedores)
- 📦 **Couriers entrantes** (paquetería, equipos comprados)
- 🏬 **Transporte entre bodega del proveedor y la tuya**
- 🚂 **Transporte ferroviario** de carga (donde aplique)

Corresponde a Alcance 3, Categoría 3 de ISO 14064-1.

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tus proveedores te **despachan materias primas o insumos**?
- ¿**Importas mercaderías** desde otros países?
- ¿Conoces el **origen geográfico** de tus principales insumos?
- ¿Sabes qué **modo de transporte** usan tus proveedores (camión, avión, barco)?
- ¿Tienes **registros de fletes pagados** o documentos de embarque (BL, AWB)?
- ¿Compras **CIF o FOB** (incoterms)?

### 💡 Tip importante

Si la respuesta a una o más de estas preguntas es **SÍ**, tu empresa probablemente debe medir y declarar emisiones en esta sub-categoría.

> ⚠️ Si el transporte se hace con tu **flota propia**, eso va en **Alcance 1 — Combustiones móviles**, no aquí.

## ¿Cómo es el cálculo de emisiones?

Misma lógica que el transporte downstream:

**CO₂eq = Peso transportado × Distancia × Factor por modo**

(unidad estándar: **ton-km**)

| Modo de transporte          | Factor referencial           |
| --------------------------- | ---------------------------- |
| Camión liviano (<3,5 ton)   | 0,25 kg CO₂eq/ton-km         |
| Camión pesado (>16 ton)     | 0,07 kg CO₂eq/ton-km         |
| Tren de carga               | 0,03 kg CO₂eq/ton-km         |
| Marítimo (contenedores)     | 0,015 kg CO₂eq/ton-km        |
| Aéreo (carga internacional) | 0,5 kg CO₂eq/ton-km          |
| Refrigerado (cold chain)    | +30-50% sobre el factor base |

> 💡 El **modo aéreo** es por lejos el más intensivo: ~30x más que marítimo.
>
> Al final de la página hay un ejemplo ilustrativo.

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica el origen de tus insumos principales

Para los insumos que más representan en tu operación:

- ¿De dónde vienen geográficamente?
- ¿Quién los transporta? (proveedor o transportista contratado por ti)
- ¿En qué modo? (terrestre, aéreo, marítimo)

⚠️ Aplica el principio de Pareto: empieza por los **top insumos en peso o gasto**.

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

### 3️⃣ Si no tienes el dato exacto

**Opción 1: Distancia geográfica entre origen y destino**

Usa Google Maps o calculadora de rutas marítimas/aéreas para estimar la distancia.

**Ejemplo:** Insumo importado desde Shanghái, China hasta un puerto de la costa pacífica de América del Sur = **~19.000 km marítimo**.

**Opción 2: Estimación por modo asumido**

Si compras a un proveedor en otra ciudad del mismo país (ej. distancia ~500 km), puedes estimar:

> 1 envío × peso × ~500 km × factor camión pesado

**Opción 3: Si compras CIF**

Si tu incoterm es CIF (Cost, Insurance, Freight), el flete está incluido en el precio del proveedor — el proveedor a veces puede entregar el detalle.

### 4️⃣ Ingreso de la información

**CASO 1: Eres novato y solo quieres introducir las cantidades**

Debes rellenar los siguientes campos:

| Campo              | Qué debes ingresar | Ejemplo                                     |
| ------------------ | ------------------ | ------------------------------------------- |
| Modo de transporte | Tipo de transporte | Terrestre, Aéreo, Marítimo, Tren            |
| Sub-modo           | Detalle            | Camión liviano, Carga marítima, Carga aérea |
| Unidad             | Unidad declarada   | ton-km, kg-km                               |
| Cantidad           | Total anual        | 190.000 ton-km                              |

💡 Si la plataforma te sugiere un factor de emisión, puedes utilizarlo para hacer los cálculos. Si no hay un factor sugerido, debes buscar uno que aplique apropiadamente a tu caso.

**CASO 2: Eres experto y utilizas factores propios**

1. Rellena los campos como en el Caso 1.
2. En **"Fuente factor"** selecciona **"Factor propio"**.
3. Modifica el campo **"Factor kgCO₂/unidad"** con tu valor personalizado.

**CASO 3: Hiciste el cálculo por fuera y ya tienes el total**

Accede a la calculadora en **modo experto**. En el paso 3, selecciona el checkbox **"Sólo quiero ingresar el total de emisiones"**.

## 📌 Ejemplo práctico

Supongamos un **taller textil** que durante el año recibe:

- **10 toneladas de tela** importada desde China — vía marítima — distancia 19.000 km
- **2 toneladas de hilados** desde un país vecino (vía terrestre, camión pesado) — distancia 1.400 km
- **200 kg de equipos** importados desde EE.UU. — vía aérea — distancia 7.000 km

Cálculo:

| Origen      | Modo      | Peso    | Distancia | ton-km  | Factor | Emisiones      |
| ----------- | --------- | ------- | --------- | ------- | ------ | -------------- |
| China       | Marítimo  | 10 ton  | 19.000 km | 190.000 | 0,015  | 2.850 kg CO₂eq |
| País vecino | Terrestre | 2 ton   | 1.400 km  | 2.800   | 0,07   | 196 kg CO₂eq   |
| EE.UU.      | Aéreo     | 0,2 ton | 7.000 km  | 1.400   | 0,5    | 700 kg CO₂eq   |

**Total sub-categoría: ~3.746 kg CO₂eq al año (~3,7 ton CO₂eq)**

> ⚠️ **Observación:** los 200 kg aéreos generan casi tanto como las 10 toneladas marítimas. Para este negocio, **reducir importaciones aéreas** es la mayor palanca.

## 📝 Notas importantes

- **Diferencia clave con Alcance 1:** si transportas insumos con **flota propia**, eso es Alcance 1, no aquí.
- **Diferencia con downstream:** acá entran insumos. Los productos que **salen** de tu empresa hacia clientes van en _Transporte y distribución aguas abajo_.
- **No dupliques con productos comprados:** el factor de "productos comprados" cubre la producción **hasta la puerta del proveedor**. El transporte desde ahí hasta tu empresa va aquí.
- **Aéreo:** factor ~30x mayor que marítimo. Para insumos pesados o volumétricos, conviene marítimo cuando es posible.
- **Cold chain:** insumos refrigerados (alimentos, biotecnología, fármacos) tienen factor mayor.
- **Incoterms:** define con tu proveedor quién paga el flete y de dónde a dónde — ayuda a delimitar lo que reportas.
- **Si compras a un proveedor local pero el insumo viene importado**, idealmente reporta **toda** la cadena de transporte (importación + último tramo).
- Guarda **BL, AWB, cartas de porte y facturas de flete** como respaldo.
