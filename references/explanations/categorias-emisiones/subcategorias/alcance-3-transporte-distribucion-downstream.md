# Transporte y distribución de bienes aguas abajo

Emisiones asociadas al **traslado y distribución de productos terminados** desde tu empresa hasta el cliente final, realizado por **terceros** (couriers, empresas de logística).

## 🚚 Transporte y distribución aguas abajo (downstream)

Esta sub-categoría incluye toda la logística que ocurre **después** de que tu producto sale de tus instalaciones, cuando el transporte lo realiza una empresa externa.

Cubre:

- 📦 **Couriers y empresas de paquetería** — globales (DHL, FedEx, UPS) y locales según el país (ej. Olva Courier o Serpost en Perú; Chilexpress, Starken o Blue Express en Chile; Servientrega Ecuador, Tramaco o Urbano en Ecuador; EPS, Domex o INPOSDOM en República Dominicana)
- 🚛 **Transportistas y empresas de logística** contratadas
- 🛒 **Despacho a domicilio** (last mile)
- 🏪 **Envío a tiendas o retailers** que después distribuyen
- 🏬 **Almacenamiento intermedio** en bodegas de terceros (3PL)
- ✈️ **Transporte aéreo o marítimo** de exportación

Corresponde a Alcance 3, Categoría 3 de ISO 14064-1.

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa **despacha productos** a clientes (B2B o B2C)?
- ¿Usas **couriers o empresas de logística** para distribuir?
- ¿Tienes **registros de envíos** (cantidad, peso, distancia, costos)?
- ¿Vendes a través de **retailers** que después distribuyen al consumidor final?
- ¿**Exportas productos** vía aérea o marítima?
- ¿Operas **bodegas de terceros (3PL)** como punto intermedio?

### 💡 Tip importante

Si la respuesta a una o más de estas preguntas es **SÍ**, tu empresa probablemente debe medir y declarar emisiones en esta sub-categoría.

> ⚠️ Si el transporte se hace con tu **flota propia** (camiones, camionetas de tu empresa), eso va en **Alcance 1 — Combustiones móviles**, NO aquí.

## ¿Cómo es el cálculo de emisiones?

El cálculo combina peso, distancia y modo de transporte:

**CO₂eq = Peso transportado × Distancia × Factor por modo**

(unidad estándar: **ton-km**)

| Modo de transporte        | Factor referencial           |
| ------------------------- | ---------------------------- |
| Camión liviano (<3,5 ton) | 0,25 kg CO₂eq/ton-km         |
| Camión pesado (>16 ton)   | 0,07 kg CO₂eq/ton-km         |
| Tren de carga             | 0,03 kg CO₂eq/ton-km         |
| Marítimo (carga general)  | 0,015 kg CO₂eq/ton-km        |
| Aéreo (carga)             | 0,6 kg CO₂eq/ton-km          |
| Refrigerado (cold chain)  | +30-50% sobre el factor base |

> 💡 Al final de la página hay un ejemplo ilustrativo.

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica los modos de despacho

Lista todos los canales por los que tu empresa entrega productos:

- Couriers contratados
- Empresas de logística (transportistas)
- Despacho a domicilio
- Envíos a retailers
- Exportaciones

⚠️ Si tienes **flota propia**, sepáralo: esa parte va en Alcance 1.

### 2️⃣ Recolecta los datos

Las fuentes principales:

- **Reportes del proveedor logístico:** algunos couriers entregan reportes de envíos con peso y distancia
- **ERP / sistema de despachos:** datos de cada envío
- **Órdenes de compra a logística:** facturas y planillas de proveedores
- **Datos contables:** gasto anual en logística

Datos mínimos a recolectar:

- **Peso total transportado** (kg o ton)
- **Distancia promedio** o ton-km totales
- **Modo de transporte** (terrestre, aéreo, marítimo)

### 3️⃣ Si no tienes el dato exacto

**Opción 1: Estimación por peso y distancia promedio**

> ton-km totales = N° envíos × peso promedio × distancia promedio

**Ejemplo:** 5.000 envíos/año × 3 kg promedio × 100 km = 1.500.000 kg-km = 1.500 ton-km

**Opción 2: Estimación por gasto en logística**

Si solo tienes el monto pagado:

> CO₂eq = $ pagado en logística × Factor sectorial (kg CO₂eq por $)

**Opción 3: Pedir reporte al proveedor**

Couriers grandes (DHL, FedEx, UPS, entre otros) pueden entregar reporte de huella anual de tu cuenta.

### 4️⃣ Ingreso de la información

**CASO 1: Eres novato y solo quieres introducir las cantidades**

Debes rellenar los siguientes campos:

| Campo              | Qué debes ingresar | Ejemplo                                    |
| ------------------ | ------------------ | ------------------------------------------ |
| Modo de transporte | Tipo de transporte | Terrestre, Aéreo, Marítimo                 |
| Sub-modo           | Detalle            | Camión liviano, Camión pesado, Carga aérea |
| Unidad             | Unidad declarada   | ton-km, km, moneda local                   |
| Cantidad           | Total anual        | 1.500 ton-km                               |

💡 Si la plataforma te sugiere un factor de emisión, puedes utilizarlo para hacer los cálculos. Si no hay un factor sugerido, debes buscar uno que aplique apropiadamente a tu caso.

**CASO 2: Eres experto y utilizas factores propios**

1. Rellena los campos como en el Caso 1.
2. En **"Fuente factor"** selecciona **"Factor propio"**.
3. Modifica el campo **"Factor kgCO₂/unidad"** con tu valor personalizado (ej. factor del proveedor logístico).

**CASO 3: Hiciste el cálculo por fuera y ya tienes el total**

Accede a la calculadora en **modo experto**. En el paso 3, selecciona el checkbox **"Sólo quiero ingresar el total de emisiones"**.

## 📌 Ejemplo práctico

Supongamos una **fábrica de alimentos** que despacha durante el año:

- **800 toneladas** de productos terminados
- Distancia promedio al cliente: **200 km** (terrestre, camión pesado)

Cálculo:

**CO₂eq = 800 ton × 200 km × 0,07 kg CO₂eq/ton-km = 11.200 kg CO₂eq**

Adicionalmente exporta **15 toneladas** vía aérea a un mercado regional (~2.500 km):

**CO₂eq aéreo = 15 × 2.500 × 0,6 = 22.500 kg CO₂eq**

**Total sub-categoría: ~33.700 kg CO₂eq al año (33,7 ton CO₂eq)**

> ⚠️ **Es importante que las unidades coincidan.** Si el factor está en kg CO₂eq/ton-km, la cantidad debe estar en ton-km.

## 📝 Notas importantes

- **Diferencia clave con Alcance 1:** si transportas con **flota propia o leasing operativo**, eso va en Alcance 1 (combustiones móviles), no aquí.
- **Diferencia con upstream:** acá se reporta lo que **sale** de tu empresa hacia el cliente. Lo que **entra** desde proveedores se reporta en _Transporte y distribución aguas arriba_.
- **Productos refrigerados** tienen factor mayor (cold chain) por consumo del equipo de refrigeración del transporte.
- **Aéreo es ~10x más intensivo** que terrestre por ton-km. Reducir aéreo es la mayor palanca de mitigación.
- **Si vendes FOB (Free On Board):** técnicamente el cliente asume el transporte. Aún así, reportarlo voluntariamente da visibilidad de la huella total de tu cadena.
- **Last mile (entrega a domicilio):** suele ser intensivo por uso de camionetas pequeñas — ojo si tienes mucho B2C.
- Guarda **reportes de los proveedores logísticos**, **facturas** y **planillas internas** como respaldo.
