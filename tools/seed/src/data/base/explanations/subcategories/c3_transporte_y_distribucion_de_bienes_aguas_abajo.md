# 🚚 Transporte y distribución de bienes aguas abajo

Esta sub-categoría incluye las emisiones asociadas al **traslado y distribución de productos terminados** desde tu empresa hasta el cliente final, realizado por **terceros** (couriers, empresas de logística).

Cubre toda la logística que ocurre **después** de que tu producto sale de tus instalaciones, cuando el transporte lo realiza una empresa externa:

- 📦 **Couriers y empresas de paquetería** (locales y globales)
- 🚛 **Transportistas y empresas de logística** contratadas
- 🛒 **Despacho a domicilio** (last mile)
- 🏪 **Envío a tiendas o retailers** que después distribuyen
- 🏬 **Almacenamiento intermedio** en bodegas de terceros (3PL)
- ✈️ **Transporte aéreo o marítimo** de exportación

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa **despacha productos** a clientes (B2B o B2C)?
- ¿Usas **couriers o empresas de logística** para distribuir?
- ¿Tienes **registros de envíos** (cantidad, peso, distancia, costos)?
- ¿Vendes a través de **retailers** que después distribuyen al consumidor final?
- ¿**Exportas productos** vía aérea o marítima?
- ¿Operas **bodegas de terceros (3PL)** como punto intermedio?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

⚠️ Si el transporte se hace con tu **flota propia** (camiones, camionetas de tu empresa), eso va en **Alcance 1 — Combustiones móviles**, NO aquí.

---

## ¿Cómo es el cálculo de emisiones?

El cálculo combina peso, distancia y modo de transporte:

> $CO₂e$ = $Peso\ transportado \times Distancia \times Factor\ por\ modo$

(unidad estándar: **ton-km**)

| Modo de transporte        | Factor referencial           |
| :------------------------ | :--------------------------- |
| Camión liviano (<3,5 ton) | 0,25 kg CO₂e/ton-km          |
| Camión pesado (>16 ton)   | 0,07 kg CO₂e/ton-km          |
| Tren de carga             | 0,03 kg CO₂e/ton-km          |
| Marítimo (carga general)  | 0,015 kg CO₂e/ton-km         |
| Aéreo (carga)             | 0,6 kg CO₂e/ton-km           |
| Refrigerado (cold chain)  | +30-50% sobre el factor base |

### 🔑 La duda que produce los errores más grandes

**¿Sumo todos los pesos y todas las distancias, y después multiplico?**

**No.** El ton-km se calcula **despacho por despacho** y después se suman los ton-km:

> ✅ **Correcto:** $Cantidad$ = $\sum_{despachos} (peso\ del\ despacho \times distancia\ del\ despacho)$
>
> ❌ **Incorrecto:** $(\sum peso) \times (\sum distancia)$

La forma incorrecta multiplica cada kilo por kilómetros que ese kilo nunca recorrió. En una operación con muchos despachos el resultado se infla cientos de veces.

💡 Sí puedes agrupar despachos que **comparten la misma distancia**: si hiciste 160 entregas de 5 ton a 200 km, calcula $5 \times 200 = 1.000$ ton-km y multiplícalo por 160. Lo que no se puede es usar **una** distancia promedio contra el peso total cuando las rutas son muy distintas entre sí — ahí conviene separar por ruta o por rango de distancia.

### 🧮 La fórmula práctica para obtener la cantidad

> Por cada ruta o modo:
> $ton\text{-}km\ de\ la\ ruta$ = $peso\ por\ despacho\ (ton) \times distancia\ del\ despacho\ (km) \times N°\ de\ despachos$
>
> Y la cantidad de la línea es la **suma** de los ton-km de las rutas que comparten modo y sub-modo.

💡 **Al final de la página hay un ejemplo ilustrativo.**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica los modos de despacho

Lista todos los canales por los que tu empresa entrega productos:

- Couriers contratados
- Empresas de logística (transportistas)
- Despacho a domicilio
- Envíos a retailers
- Exportaciones

⚠️ Si tienes **flota propia**, sepáralo: esa parte va en Alcance 1.

---

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

---

### 3️⃣ Si no tienes el dato exacto

#### **Opción 1:** Estimación por peso y distancia promedio

> $ton{\text -}km\ totales$ = $N°\ envíos \times peso\ promedio \times distancia\ promedio$

_Ejemplo:_ 5.000 envíos/año × 3 kg promedio × 100 km = 1.500.000 kg-km = **1.500 ton-km**

---

#### **Opción 2:** Estimación por gasto en logística

Si solo tienes el monto pagado:

> $CO₂e$ = $Gasto\ en\ logística \times Factor\ sectorial$

---

#### **Opción 3:** Pedir reporte al proveedor

Couriers grandes (DHL, FedEx, UPS, entre otros) pueden entregar reporte de huella anual de tu cuenta.

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir las cantidades**

Debes rellenar los siguientes campos:

| Campo              | Qué debes ingresar                                                     |                                    Ejemplo |
| :----------------- | :--------------------------------------------------------------------- | -----------------------------------------: |
| Modo de transporte | Tipo de transporte                                                     |                 Terrestre, Aéreo, Marítimo |
| Sub-modo           | Detalle                                                                | Camión liviano, Camión pesado, Carga aérea |
| Unidad             | Unidad declarada                                                       |                   ton-km, km, moneda local |
| Cantidad           | Suma de los ton-km de cada despacho del año (peso × distancia, sumado) |                             160.000 ton-km |

⚠️ El campo **"Fuente factor" no debes modificarlo**

⚠️ Si el transporte utilizado no está en la lista, selecciona **Otro** y declara tu propio factor de emisión en **"Fuente factor" → "Otro"**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Rellena los campos igual que en el Caso 1.

2.- En el campo **"Fuente factor"**, selecciona **"Otro"**.

3.- Modifica el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado (ej. factor del proveedor logístico).

---

**CASO 3:** Hiciste el cálculo por fuera y **ya tienes las emisiones totales de la sub-categoría**

Accede a la calculadora en **modo experto**. En el paso 3, selecciona el checkbox **"Sólo quiero ingresar el total de emisiones"**.

---

### 📌 Ejemplo práctico

Supongamos una **fábrica de alimentos** que durante el año despacha:

- **160 entregas de 5 ton** a clientes, terrestre en camión pesado, **200 km** por entrega
- **6 exportaciones de 2,5 ton** vía aérea a un mercado regional, **2.500 km** por envío

Primero el ton-km **de cada despacho**, y luego el total de la ruta:

| Ruta              | Modo      | Peso por despacho | Distancia | ton-km por despacho | Despachos | ton-km de la ruta |
| :---------------- | :-------- | ----------------: | --------: | ------------------: | --------: | ----------------: |
| Clientes locales  | Terrestre |             5 ton |    200 km |               1.000 |       160 |           160.000 |
| Exportación aérea | Aéreo     |           2,5 ton |  2.500 km |               6.250 |         6 |            37.500 |

Esos totales de ruta son los que escribes en el campo **Cantidad**, una línea por modo. Después la plataforma calcula las emisiones:

| Ruta              | Modo      | Cantidad (ton-km) | Factor |      Emisiones |
| :---------------- | :-------- | ----------------: | -----: | -------------: |
| Clientes locales  | Terrestre |           160.000 |   0,07 | 11.200 kg CO₂e |
| Exportación aérea | Aéreo     |            37.500 |    0,6 | 22.500 kg CO₂e |

**Total sub-categoría: ~33.700 kg CO₂e al año (33,7 ton CO₂e)**

> ⚠️ **Así se vería el error.** Sumar todos los pesos (800 + 15 = **815 ton**) y todas las distancias (160×200 + 6×2.500 = **47.000 km**) y multiplicarlas da **38.305.000 ton-km** frente a los 197.500 reales: casi **200 veces** la cantidad correcta. Cuantos más despachos, peor es.
>
> 💡 Las 15 toneladas aéreas emiten el **doble** que las 800 toneladas terrestres. El modo pesa mucho más que el tonelaje.

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en kg CO₂e/ton-km, la cantidad debe estar en ton-km.

---

## 📝 Notas importantes

> - **El ton-km se calcula despacho por despacho** y después se suma. Sumar todos los pesos y todas las distancias para multiplicarlas al final infla la cantidad de forma dramática
> - **Diferencia clave con Alcance 1:** si transportas con **flota propia o leasing operativo**, eso va en Alcance 1 (combustiones móviles), no aquí
> - **Diferencia con upstream:** acá se reporta lo que **sale** de tu empresa hacia el cliente. Lo que **entra** desde proveedores se reporta en _Transporte y distribución aguas arriba_
> - **Productos refrigerados** tienen factor mayor (cold chain) por consumo del equipo de refrigeración del transporte
> - **Aéreo es ~10x más intensivo** que terrestre por ton-km. Reducir aéreo es la mayor palanca de mitigación
> - **Si vendes FOB (Free On Board):** técnicamente el cliente asume el transporte. Aún así, reportarlo voluntariamente da visibilidad de la huella total de tu cadena
> - **Last mile (entrega a domicilio):** suele ser intensivo por uso de camionetas pequeñas — ojo si tienes mucho B2C
> - Guarda **reportes de los proveedores logísticos**, **facturas** y **planillas internas** como respaldo
