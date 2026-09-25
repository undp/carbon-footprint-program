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

Lo que ingresas en **Cantidad** depende del transporte, porque cada factor está expresado en una unidad distinta:

| Transporte                                                | Unidad del factor | Qué ingresas en "Cantidad"                                        |
| :-------------------------------------------------------- | :---------------- | :---------------------------------------------------------------- |
| Tren de carga, barco (contenedores o granel), avión       | kg CO₂e/ton-km    | **ton-km**: peso × distancia de cada despacho, sumado             |
| Camión (refrigerado o no), van (eléctrica o a combustión) | kg CO₂e/km        | **km**: distancia recorrida por el vehículo en cada viaje, sumada |

> $CO₂e$ = $Cantidad \times Factor$

En la plataforma, la unidad ton-km aparece como **km-ton**.

El factor de cada transporte aparece en el campo **"Factor kgCO₂e/unidad"** al elegirlo, y corresponde al año de tu huella.

### 🔑 Las dudas que producen los errores más grandes

**Tren, barco o avión: ¿sumo todos los pesos y todas las distancias, y después multiplico?**

**No.** El ton-km se calcula **despacho por despacho** y después se suman los ton-km:

> ✅ **Correcto:** $Cantidad$ = $\sum_{despachos} (peso\ del\ despacho \times distancia\ del\ despacho)$
>
> ❌ **Incorrecto:** $(\sum peso) \times (\sum distancia)$

La forma incorrecta multiplica cada kilo por kilómetros que ese kilo nunca recorrió. En una operación con muchos despachos el resultado se infla cientos de veces.

💡 Sí puedes agrupar despachos que **comparten la misma distancia**: si hiciste 6 envíos aéreos de 2,5 ton a 2.000 km, calcula $2,5 \times 2.000 = 5.000$ ton-km y multiplícalo por 6. Lo que no se puede es usar **una** distancia promedio contra el peso total cuando las rutas son muy distintas entre sí — ahí conviene separar por ruta o por rango de distancia.

**Camión o van: ¿multiplico los km por el peso?**

**No.** El factor ya corresponde al **vehículo completo**, así que la cantidad son solo los km que recorrió. El peso de la carga no entra en el cálculo.

⚠️ Como el factor asigna a tu empresa todo el viaje, úsalo cuando el vehículo lleva solo tu carga. Si tu carga comparte vehículo con la de otras empresas (courier, carga consolidada), pide al proveedor el reporte de emisiones de tu cuenta (Opción 3).

### 🧮 La fórmula práctica para obtener la cantidad

> Por cada ruta:
>
> - Tren, barco o avión: $ton\text{-}km\ de\ la\ ruta$ = $peso\ por\ despacho\ (ton) \times distancia\ del\ despacho\ (km) \times N°\ de\ despachos$
> - Camión o van: $km\ de\ la\ ruta$ = $distancia\ por\ viaje\ (km) \times N°\ de\ viajes$
>
> Y la cantidad de la línea es la **suma** de las rutas que comparten el mismo transporte.

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

- **Transporte** de cada despacho (camión, van, tren, barco o avión)
- **Distancia** de cada despacho o viaje
- **Peso** de cada despacho, solo para tren, barco y avión

---

### 3️⃣ Si no tienes el dato exacto

#### **Opción 1:** Estimación por peso y distancia promedio

> Tren, barco o avión: $ton{\text -}km\ totales$ = $N°\ envíos \times peso\ promedio \times distancia\ promedio$
>
> Camión o van: $km\ totales$ = $N°\ viajes \times distancia\ promedio\ por\ viaje$

_Ejemplo:_ 50 envíos aéreos/año × 0,3 ton promedio × 1.000 km = **15.000 ton-km**

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

| Campo      | Qué debes ingresar                                                                                              |                                            Ejemplo |
| :--------- | :-------------------------------------------------------------------------------------------------------------- | -------------------------------------------------: |
| Transporte | Tipo de transporte                                                                                              | Camión no refrigerado, Avión: Short haul (<2500km) |
| Unidad     | **km-ton** para tren, barco y avión; **km** para camión y van                                                   |                                         km-ton, km |
| Cantidad   | Tren, barco y avión: suma de los ton-km de cada despacho. Camión y van: suma de los km recorridos en cada viaje |                           30.000 km-ton, 32.000 km |

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

- **160 entregas de 5 ton** a clientes, cada una en su propio camión no refrigerado, **200 km** recorridos por entrega
- **6 exportaciones de 2,5 ton** vía aérea a un mercado regional, **2.000 km** por envío

Primero la cantidad de cada ruta:

| Ruta              | Transporte                  | Cálculo                          |      Cantidad |
| :---------------- | :-------------------------- | :------------------------------- | ------------: |
| Clientes locales  | Camión no refrigerado       | 200 km × 160 viajes              |     32.000 km |
| Exportación aérea | Avión: Short haul (<2500km) | 2,5 ton × 2.000 km × 6 despachos | 30.000 km-ton |

Esas cantidades son las que escribes en el campo **Cantidad**, una línea por transporte. Después la plataforma calcula las emisiones:

| Ruta              | Transporte                  |      Cantidad |  Factor |      Emisiones |
| :---------------- | :-------------------------- | ------------: | ------: | -------------: |
| Clientes locales  | Camión no refrigerado       |     32.000 km | 0,89743 | 28.718 kg CO₂e |
| Exportación aérea | Avión: Short haul (<2500km) | 30.000 km-ton | 1,27835 | 38.351 kg CO₂e |

_(Factores ilustrativos; el factor real es gestionado por la plataforma según el transporte y el año de tu huella)_

**Total sub-categoría: ~67.069 kg CO₂e al año (~67,1 ton CO₂e)**

> ⚠️ **Así se vería el error.**
>
> - **Avión:** sumar todos los pesos (6 × 2,5 = **15 ton**) y todas las distancias (6 × 2.000 = **12.000 km**) y multiplicarlos da **180.000 ton-km** frente a los 30.000 reales: **6 veces** la cantidad correcta. Cuantos más despachos, peor es.
> - **Camión:** multiplicar los km por el peso (32.000 km × 5 ton = **160.000**) da **5 veces** la cantidad correcta, porque el factor ya cubre el camión completo.
>
> 💡 Las 15 toneladas aéreas emiten **más** que las 800 toneladas que viajan en camión. El modo pesa mucho más que el tonelaje.

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en kg CO₂e/ton-km, la cantidad debe estar en ton-km (km-ton en la plataforma). Si está en kg CO₂e/km, la cantidad debe estar en km.

---

## 📝 Notas importantes

> - **En tren, barco y avión, el ton-km se calcula despacho por despacho** y después se suma. Sumar todos los pesos y todas las distancias para multiplicarlas al final infla la cantidad de forma dramática
> - **En camión y van, la cantidad son los km recorridos**, sin multiplicar por el peso
> - **Diferencia clave con Alcance 1:** si transportas con **flota propia o leasing operativo**, eso va en Alcance 1 (combustiones móviles), no aquí
> - **Diferencia con upstream:** acá se reporta lo que **sale** de tu empresa hacia el cliente. Lo que **entra** desde proveedores se reporta en _Transporte y distribución aguas arriba_
> - **Productos refrigerados** tienen factor mayor (cold chain) por consumo del equipo de refrigeración del transporte
> - **Aéreo es el modo más intensivo por tonelada:** su factor es ~55 a 80 veces el del barco en contenedores. Reducir aéreo es la mayor palanca de mitigación
> - **Si vendes FOB (Free On Board):** técnicamente el cliente asume el transporte. Aún así, reportarlo voluntariamente da visibilidad de la huella total de tu cadena
> - **Last mile (entrega a domicilio):** suele ser intensivo por uso de camionetas pequeñas — ojo si tienes mucho B2C
> - Guarda **reportes de los proveedores logísticos**, **facturas** y **planillas internas** como respaldo
