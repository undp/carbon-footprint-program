-- Refresh four transport guides on databases that were already seeded.
--
-- The seed cannot do this. seed.ts aborts the whole run when the database
-- already contains data (the country-count gate), so seedExplanations never
-- re-inlines a markdown file that changed after the first seed: an installed
-- deployment keeps serving the text it was seeded with. This migration writes
-- the current file content onto each row, so the (i) panel matches the
-- repository and a later reseed is a no-op.
--
-- What changed in the text (see the accompanying seed data commits). The first
-- three guides now follow the rule the reviewers asked for: the worked example
-- ends at the number the user types into "Cantidad", not at the emissions the
-- platform already computes.
--
-- 1. "Desplazamiento diario de empleados" -- the guide asked for "total anual
--    agregado" without saying of what. It now states that the quantity is the
--    whole year for everyone, declares per factor whether it is built per
--    passenger or per vehicle, and spells out the carpool rule: a shared car
--    counts once, and someone driving alone carries the whole vehicle. Its old
--    example multiplied the car line by the number of *people*, which taught
--    the double count for a per-vehicle factor; the new one multiplies by cars
--    and shows what counting people would have added.
--
-- 2. "Transporte y distribución de bienes aguas arriba" and
-- 3. "... aguas abajo" -- both stated the calculation as
--    "peso transportado x distancia" for every mode and asked for ton-km on
--    every line, but the catalogue prices trucks and vans per vehicle-km
--    (kg/km) and only rail, sea and air per ton-km (kg/km-ton). Both now say
--    per mode what goes into "Cantidad": ton-km computed per trip and summed
--    for rail, sea and air -- never the summed weights times the summed
--    distances, the most common error found in verification -- and the km the
--    vehicle drove for trucks and vans, without multiplying by the weight. The
--    reference table and the worked examples use the catalogue's own mode names
--    and factors, and each example closes by showing the inflated figure each
--    wrong order produces.
--
-- 4. "Viajes de negocios - Traslado" and the taxi rows of guide 1 -- both
--    told users the gasoline taxi factor is per vehicle and must not be
--    multiplied by occupants. The catalogue value (0.148 / 0.149) is DEFRA
--    2025's "Regular taxi" per passenger.km row (0.14861); the per-km row is
--    0.20806. The guides now put the gasoline taxi with the per-passenger modes
--    and the business-travel example multiplies its taxi line by the people
--    who rode. The electric and hybrid commuting taxi rows keep their
--    per-vehicle label: they match no DEFRA taxi row, and the hybrid value is
--    the per-vehicle hybrid car factor.
--
-- Same shape as 20260825150000_update_business_travel_transport_explanation:
-- each row is matched through the demo country's base methodology, so a
-- country deployment that maintains its own methodology decides for itself,
-- and every write is guarded by IS DISTINCT FROM, so re-running the migration
-- touches zero rows. Guide 4 was last written by that migration; this one
-- carries a later timestamp, so it lands after it.
--
-- Guide text only: no factor, no captured inventory line and no computed total
-- is touched here.

-- Desplazamiento diario de empleados
WITH guide AS (SELECT $md$# 🚌 Desplazamiento diario de empleados

Esta sub-categoría incluye las emisiones asociadas al **traslado cotidiano de los empleados entre su hogar y el lugar de trabajo (commuting)**.

Cubre todos los modos de transporte que usan los empleados, con desglose de **Tipo** y, cuando aplica, **Combustible**:

- 🚗 **Auto** (Gasolina, Diésel, Eléctrico, Híbrido)
- 🏍️ **Moto** (Gasolina, Eléctrico)
- 🚌 **Bus urbano** / **Bus interurbano**
- 🚇 **Metro**
- 🚂 **Tren cercanías** / **Tren larga distancia**
- 🚕 **Taxi / Ride-share** (Gasolina, Eléctrico, Híbrido)
- 🚲 **Bici** (factor 0)
- 🚶 **Caminata** (factor 0)

> Para modos que no se desglosan por combustible (Bus, Metro, Tren, Bici, Caminata), usa la variante **"No aplica"**.

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa **tiene empleados** que se desplazan a una oficina, planta o local?
- ¿Tus empleados usan **auto, moto, bus, metro, tren, taxi/ride-share, bici o caminata** para llegar al trabajo?
- ¿Conoces o puedes estimar la **distancia recorrida en el año** por tus empleados en cada modo?
- ¿Cubres algún **acercamiento corporativo o viático de transporte**?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

> Para empresas de **servicios** (consultoras, estudios, software), el commuting suele ser una de las fuentes más significativas del Alcance 3.

---

## ¿Cómo es el cálculo de emisiones?

La plataforma trabaja con **cantidades agregadas a nivel organización**, no por empleado individual. Para cada combinación de **Tipo × Combustible** usada por tu equipo, suma el total anual de km y se multiplica por el factor correspondiente:

> $CO_2e$ = $Distancia\ anual\ agregada\ (km) \times Factor\ por\ Tipo\ y\ Combustible\ (kg\ CO_2e/km)$

Factores referenciales (DEFRA 2025):

| Tipo                 | Combustible | Factor (kg CO₂e/km) | El factor es por... |
| :------------------- | :---------- | ------------------: | :------------------ |
| Auto                 | Gasolina    |               0.173 | vehículo            |
| Auto                 | Diésel      |               0.166 | vehículo            |
| Auto                 | Eléctrico   |               0.047 | vehículo            |
| Auto                 | Híbrido     |               0.110 | vehículo            |
| Moto                 | Gasolina    |               0.114 | vehículo            |
| Moto                 | Eléctrico   |               0.030 | vehículo            |
| Bus urbano           | No aplica   |               0.117 | pasajero            |
| Bus interurbano      | No aplica   |               0.027 | pasajero            |
| Metro                | No aplica   |               0.041 | pasajero            |
| Tren cercanías       | No aplica   |               0.035 | pasajero            |
| Tren larga distancia | No aplica   |               0.035 | pasajero            |
| Taxi/Ride-share      | Gasolina    |               0.149 | pasajero            |
| Taxi/Ride-share      | Eléctrico   |               0.060 | vehículo            |
| Taxi/Ride-share      | Híbrido     |               0.110 | vehículo            |
| Bici                 | No aplica   |               0.000 | persona             |
| Caminata             | No aplica   |               0.000 | persona             |

### 🔑 Las tres dudas más frecuentes

**1️⃣ ¿Ingreso los kilómetros de una persona o de todas?**

De **todas**, y son los del **año completo**. La cantidad es siempre el total anual recorrido por todas las personas que usaron ese modo. La plataforma no multiplica por el número de empleados: ese cálculo lo haces tú antes de escribir la cantidad.

**2️⃣ ¿Multiplico por el número de personas? Depende del modo.**

Esta es la duda que produce los errores más grandes, en las dos direcciones:

- 🚌 **Bus, 🚇 metro, 🚂 tren y 🚕 taxi a gasolina:** el factor es **por pasajero**. Multiplica la distancia por el número de personas. Si 10 empleados hacen 15 km diarios en metro durante 200 días, ingresas **30.000 km**.
- 🚗 **Auto, 🏍️ moto y taxi eléctrico o híbrido:** el factor es **por vehículo**, no por ocupante. Cuentas los kilómetros que recorrió **cada vehículo una sola vez**, sin importar cuánta gente iba dentro.

💡 El taxi a gasolina usa el factor DEFRA **por pasajero-km**, que ya considera la ocupación promedio del taxi. Por eso, si dos empleados comparten un taxi a gasolina, cuentas los km **de cada uno**.

**3️⃣ ¿Y si dos empleados comparten el auto?**

Ese auto se cuenta **una sola vez**. Dos personas que viajan juntas en un auto generan las emisiones de **un** auto, no de dos: el factor ya es del vehículo completo. Al revés también importa — quien viaja solo carga con todas las emisiones de su vehículo, no con una fracción.

> ⚠️ El efecto es grande. Diez empleados que llegan cada uno en su auto son diez vehículos; los mismos diez repartidos en tres autos compartidos son **tres**. Si cuentas "10 personas × su distancia" en un modo por vehículo, sobreestimas más del triple.

### 🧮 La fórmula práctica para obtener la cantidad

> **Bus / metro / tren / taxi a gasolina** (factor por pasajero):
> $Cantidad$ = $km\ ida\ y\ vuelta \times días\ presenciales\ al\ año \times N°\ de\ personas$
>
> **Auto / moto / taxi eléctrico o híbrido** (factor por vehículo):
> $Cantidad$ = $km\ ida\ y\ vuelta \times días\ presenciales\ al\ año \times N°\ de\ vehículos$

En los modos por vehículo, **N° de vehículos** es la cantidad de autos, motos o taxis eléctricos o híbridos que efectivamente se movieron — no la cantidad de personas que viajaron en ellos.

💡 Cuenta siempre **ida y vuelta**: si la casa está a 11 km del trabajo, cada día presencial son 22 km.

💡 **Al final de la página hay un ejemplo ilustrativo.**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica tu fuerza laboral

- Total de empleados
- Modalidad: presencial / híbrido / 100% remoto
- Días presenciales por semana (en híbridos)
- Días al año efectivamente trabajados (descontando vacaciones, feriados, licencias)

---

### 2️⃣ Recolecta los datos de transporte

La fuente más confiable es una **encuesta interna** anual. Pregunta a cada empleado:

- ¿Cómo te trasladas habitualmente al trabajo?
- ¿Cuántos km hay (ida y vuelta) entre tu casa y el trabajo?
- ¿Cuántos días a la semana asistes presencialmente?
- Si usa auto/moto/taxi: ¿qué combustible o variante?
- Si usa auto o moto: **¿viajas solo o compartes el vehículo?** Y si compartes, ¿con cuántas personas y quién conduce?

💡 La última pregunta es la que permite contar vehículos en lugar de personas en los modos por vehículo. Sin ella tendrás que asumir un factor de ocupación y declararlo como supuesto.

⚠️ Si la encuesta tiene baja tasa de respuesta, extrapola con los datos disponibles y declara el supuesto.

---

### 3️⃣ Si no tienes encuesta o datos detallados

#### **Opción 1:** Estimación por ubicación de residencia

Si conoces la comuna, distrito, municipio o código postal de cada empleado, puedes estimar la distancia hasta la oficina con Google Maps o herramientas geo.

---

#### **Opción 2:** Promedios nacionales o de la ciudad

La distancia promedio al trabajo en grandes ciudades de la región suele estar en **8-15 km** (ida). El **mix de modos** varía mucho por ciudad — busca estadísticas locales si están disponibles. Si no, aplica una mezcla razonable:

> Ejemplo (gran ciudad de la región): 40-60% transporte público, 30-50% auto/moto, 5-10% otros (a pie, bici)

---

### 4️⃣ Ingreso de la información

Por cada combinación de **Tipo × Combustible** que aplique a tu equipo, agrega una línea con:

| Campo       | Qué debes ingresar                                                                                                   |   Ejemplo |
| :---------- | :------------------------------------------------------------------------------------------------------------------- | --------: |
| Tipo        | Modo de transporte                                                                                                   |      Auto |
| Combustible | Combustible o variante (o "No aplica")                                                                               |  Gasolina |
| Unidad      | Unidad de distancia (km)                                                                                             |        km |
| Cantidad    | Distancia total del año: km ida y vuelta × días presenciales × personas (o × vehículos si el factor es por vehículo) | 20.328 km |

⚠️ El campo **"Fuente factor" no debes modificarlo**, salvo que uses factores propios.

⚠️ Si el medio de transporte que usan tus empleados no está en la lista, selecciona **Otro** y declara tu propio factor de emisión en **"Fuente factor" → "Otro"**

---

### 📌 Ejemplo práctico

Supongamos una **consultora de 15 empleados** en modalidad híbrida (3 días presencial), con una encuesta que arrojó:

- Distancia promedio ida y vuelta: **22 km**
- Días presenciales al año: 3 días/semana × 44 semanas = **132 días**
- 8 personas llegan en **auto a gasolina**, y de ellas **dos comparten un auto** → son **7 autos**
- 5 personas llegan en **bus urbano**
- 2 personas llegan en **bici**

Primero se calcula la **cantidad** de cada línea. Fíjate en qué se multiplica en cada caso:

| Línea                  | Cálculo de la cantidad            |  Cantidad |
| :--------------------- | :-------------------------------- | --------: |
| Auto / Gasolina        | 22 km × 132 días × **7 autos**    | 20.328 km |
| Bus urbano / No aplica | 22 km × 132 días × **5 personas** | 14.520 km |
| Bici / No aplica       | 22 km × 132 días × **2 personas** |  5.808 km |

Esas tres cantidades son los números que escribes en el campo **Cantidad**, una línea por combinación. Después la plataforma calcula las emisiones:

| Línea                  | Cantidad (km) | Factor (kg CO₂e/km) |     Emisiones |
| :--------------------- | ------------: | ------------------: | ------------: |
| Auto / Gasolina        |        20.328 |               0,173 | 3.517 kg CO₂e |
| Bus urbano / No aplica |        14.520 |               0,117 | 1.699 kg CO₂e |
| Bici / No aplica       |         5.808 |               0,000 |     0 kg CO₂e |

**Total commuting: ~5.216 kg CO₂e al año (~5,2 ton CO₂e)**

> 💡 Mira la línea del auto. Se multiplicó por **7 autos**, no por las 8 personas que llegan en auto, porque el factor es del vehículo. Contar las 8 personas habría dado 23.232 km y **502 kg CO₂e de más** en esa sola línea — y el error crece con cada auto compartido.
>
> 💡 La bici se declara igual, aunque su factor sea 0: deja registrado cuánta gente ya se mueve sin emitir.

⚠️ Es importante que las **unidades coincidan**: el factor está en kg CO₂e/km, la cantidad debe estar en km.

---

## 📝 Notas importantes

> - **Pasajero-km vs vehículo-km:** bus, metro, tren y taxi a gasolina se multiplican por el número de personas; auto, moto y taxi eléctrico o híbrido no. Es el error más común al declarar esta sub-categoría, y el que un verificador detecta primero
> - **Auto compartido:** un vehículo con dos ocupantes se cuenta **una vez**. Y quien viaja solo carga con **todas** las emisiones de su vehículo, no con una fracción — es el mismo factor completo del auto
> - **Toda la distancia del año, ida y vuelta:** la cantidad es el total anual de todas las personas (o de todos los vehículos) en ese modo, contando los dos tramos de cada día
> - **Diferencia con Alcance 1:** si el empleado se mueve en un **vehículo corporativo**, eso es Alcance 1 (combustión móvil), no commuting. Solo cuenta acá si usa **medios propios o de terceros**.
> - **Diferencia con Viajes de negocios:** commuting es el desplazamiento **cotidiano casa-trabajo**. Los viajes laborales puntuales (a otra ciudad, a un cliente, etc.) van en **Viajes de negocios — Traslado**.
> - **Trabajo remoto:** las emisiones del teletrabajo se reportan en la sub-categoría **"Trabajo remoto de empleados"**, no aquí.
> - **Bici y caminata:** factor 0, pero igual incluye los empleados en la encuesta para entender la distribución.
> - **Acercamiento corporativo:** si tu empresa contrata buses para llevar empleados, esas emisiones también van aquí (o en Alcance 1 si es flota propia).
> - Guarda los **resultados de la encuesta** y la metodología como respaldo.
$md$::text AS "content")
UPDATE "subcategory" s
SET "explanation" = guide."content"
FROM guide, "category" c
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE s."category_id" = c."id"
  AND c."name" = 'Otras emisiones indirectas' AND mv."name" = 'Metodología inicial' AND co."iso_code" = 'PD'
  AND s."name" = 'Desplazamiento diario de empleados' AND s."status" <> 'DELETED'
  AND s."explanation" IS DISTINCT FROM guide."content";

-- Transporte y distribución de bienes aguas arriba
WITH guide AS (SELECT $md$# 🚛 Transporte y distribución de bienes aguas arriba

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
$md$::text AS "content")
UPDATE "subcategory" s
SET "explanation" = guide."content"
FROM guide, "category" c
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE s."category_id" = c."id"
  AND c."name" = 'Otras emisiones indirectas' AND mv."name" = 'Metodología inicial' AND co."iso_code" = 'PD'
  AND s."name" = 'Transporte y distribución de bienes aguas arriba' AND s."status" <> 'DELETED'
  AND s."explanation" IS DISTINCT FROM guide."content";

-- Transporte y distribución de bienes aguas abajo
WITH guide AS (SELECT $md$# 🚚 Transporte y distribución de bienes aguas abajo

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

| Ruta              | Transporte                  |      Cantidad | Factor |     Emisiones |
| :---------------- | :-------------------------- | ------------: | -----: | ------------: |
| Clientes locales  | Camión no refrigerado       |     32.000 km | 0,2115 | 6.768 kg CO₂e |
| Exportación aérea | Avión: Short haul (<2500km) | 30.000 km-ton | 0,2051 | 6.153 kg CO₂e |

**Total sub-categoría: ~12.921 kg CO₂e al año (~12,9 ton CO₂e)**

> ⚠️ **Así se vería el error.**
>
> - **Avión:** sumar todos los pesos (6 × 2,5 = **15 ton**) y todas las distancias (6 × 2.000 = **12.000 km**) y multiplicarlos da **180.000 ton-km** frente a los 30.000 reales: **6 veces** la cantidad correcta. Cuantos más despachos, peor es.
> - **Camión:** multiplicar los km por el peso (32.000 km × 5 ton = **160.000**) da **5 veces** la cantidad correcta, porque el factor ya cubre el camión completo.
>
> 💡 Las 15 toneladas aéreas emiten **casi lo mismo** que las 800 toneladas que viajan en camión. El modo pesa mucho más que el tonelaje.

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en kg CO₂e/ton-km, la cantidad debe estar en ton-km (km-ton en la plataforma). Si está en kg CO₂e/km, la cantidad debe estar en km.

---

## 📝 Notas importantes

> - **En tren, barco y avión, el ton-km se calcula despacho por despacho** y después se suma. Sumar todos los pesos y todas las distancias para multiplicarlas al final infla la cantidad de forma dramática
> - **En camión y van, la cantidad son los km recorridos**, sin multiplicar por el peso
> - **Diferencia clave con Alcance 1:** si transportas con **flota propia o leasing operativo**, eso va en Alcance 1 (combustiones móviles), no aquí
> - **Diferencia con upstream:** acá se reporta lo que **sale** de tu empresa hacia el cliente. Lo que **entra** desde proveedores se reporta en _Transporte y distribución aguas arriba_
> - **Productos refrigerados** tienen factor mayor (cold chain) por consumo del equipo de refrigeración del transporte
> - **Aéreo es el modo más intensivo por tonelada:** su factor es ~8 a 13 veces el del barco en contenedores. Reducir aéreo es la mayor palanca de mitigación
> - **Si vendes FOB (Free On Board):** técnicamente el cliente asume el transporte. Aún así, reportarlo voluntariamente da visibilidad de la huella total de tu cadena
> - **Last mile (entrega a domicilio):** suele ser intensivo por uso de camionetas pequeñas — ojo si tienes mucho B2C
> - Guarda **reportes de los proveedores logísticos**, **facturas** y **planillas internas** como respaldo
$md$::text AS "content")
UPDATE "subcategory" s
SET "explanation" = guide."content"
FROM guide, "category" c
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE s."category_id" = c."id"
  AND c."name" = 'Otras emisiones indirectas' AND mv."name" = 'Metodología inicial' AND co."iso_code" = 'PD'
  AND s."name" = 'Transporte y distribución de bienes aguas abajo' AND s."status" <> 'DELETED'
  AND s."explanation" IS DISTINCT FROM guide."content";

-- Viajes de negocios - Traslado
WITH guide AS (SELECT $md$# ✈️ Viajes de negocios — Traslado

Esta sub-categoría incluye todo el **transporte asociado a viajes laborales** de empleados, distinto del desplazamiento diario casa-trabajo: vuelos, buses, trenes, taxis, vehículos arrendados u otros medios utilizados para viajes de negocios.

Cubre:

- ✈️ **Vuelos comerciales** (nacionales e internacionales)
- 🚌 **Buses interurbanos**
- 🚂 **Trenes**
- 🚕 **Taxis y plataformas** (Uber, Cabify, DiDi) en destino
- 🚗 **Vehículos arrendados** (rent-a-car)
- ⛴️ **Ferries o transporte marítimo** (en algunos casos)
- 🛺 **Transportes locales** durante el viaje

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tus empleados **viajan en avión, bus o tren** por motivos laborales?
- ¿Usan **taxis, Uber o ride-hailing** durante viajes laborales?
- ¿**Arriendan vehículos** durante viajes (rent-a-car)?
- ¿Tienes registros de **tickets, boarding passes o rendiciones de gastos**?
- ¿Tu empresa usa una **plataforma de booking corporativo**?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

> Para empresas que viajan mucho, **el modo aéreo suele dominar** la huella de viajes — y es la mayor palanca de mitigación (videoconferencias, agrupación de viajes).

---

## ¿Cómo es el cálculo de emisiones?

La plataforma trabaja con **cantidades agregadas a nivel organización**, no viaje por viaje. Para cada opción de **Transporte** que tu equipo haya usado en el año, ingresas una línea con el total de distancia y se multiplica por su factor:

> $CO_2e$ = $Distancia\ anual\ agregada \times Factor\ del\ Transporte\ (kg\ CO_2e/km)$

### 🔑 Las dos dudas más frecuentes

**1️⃣ ¿Ingreso los km de una persona o los multiplico por el número de personas?**

Depende del modo, porque el factor no está construido igual en todos:

- ✈️ **Avión, 🚌 bus, 🚂 tren y 🚕 taxi:** el factor es **por pasajero** (kg CO₂e por pasajero-km). Debes **multiplicar la distancia por el número de personas que viajaron**. Si 3 personas volaron 1.000 km, ingresas **3.000 km**; si 3 personas compartieron un taxi de 20 km, ingresas **60 km**.
- 🚗 **Auto:** el factor es **por vehículo** (kg CO₂e por km recorrido por el vehículo). Ingresas **los km del vehículo una sola vez**, sin importar cuántos ocupantes iban. Si 3 personas compartieron un auto arrendado por 200 km, ingresas **200 km**, no 600.

💡 El taxi usa el factor DEFRA **por pasajero-km**, que ya considera la ocupación promedio del taxi. Por eso se multiplica por personas, igual que el bus.

**2️⃣ ¿El viaje es solo ida o ida y vuelta?**

Se cuenta **toda la distancia efectivamente recorrida**: si el viaje fue ida y vuelta, debes contar **los dos tramos**. Un viaje de ida y vuelta entre dos ciudades separadas por 800 km son **1.600 km**, no 800.

### 🧮 La fórmula práctica para obtener la cantidad

> **Avión / bus / tren / taxi:**  
> $Cantidad$ = $km\ por\ tramo \times N°\ de\ tramos \times N°\ de\ personas \times N°\ de\ viajes$
>
> **Auto:**  
> $Cantidad$ = $km\ por\ tramo \times N°\ de\ tramos \times N°\ de\ viajes$ (sin multiplicar por ocupantes)

Donde **N° de tramos** = 2 en un viaje de ida y vuelta, 1 si fue solo ida.

### Factores de la plataforma (DEFRA 2025)

| Opción de Transporte                                | Factor (kg CO₂e/km) | El factor es por... |
| :-------------------------------------------------- | ------------------: | :------------------ |
| Transporte en avión: Short haul (<3 hrs) Economy    |              0,1257 | pasajero            |
| Transporte en avión: Short haul (<3 hrs) Business   |              0,1886 | pasajero            |
| Transporte en avión: Medium haul (3-6 hrs) Economy  |              0,1170 | pasajero            |
| Transporte en avión: Medium haul (3-6 hrs) Business |              0,3394 | pasajero            |
| Transporte en avión: Long haul (>6 hrs) Economy     |              0,1091 | pasajero            |
| Transporte en avión: Long haul (>6 hrs) Business    |              0,3165 | pasajero            |
| Transporte en Bus                                   |              0,1038 | pasajero            |
| Transporte en Tren                                  |              0,0354 | pasajero            |
| Transporte en Taxi                                  |              0,1480 | pasajero            |
| Transporte en auto                                  |              0,1730 | vehículo            |

💡 **La clase ya viene incluida en la opción.** No debes aplicar ningún multiplicador extra por Business: el factor de Business ya es más alto que el de Economy (entre ~1,5× y ~2,9× según el tramo), porque un asiento premium ocupa el espacio de varios asientos económicos.

💡 **Referencia orientativa para elegir el tramo aéreo:** _short haul_ (<3 hrs) ≈ hasta ~2.000 km; _medium haul_ (3-6 hrs) ≈ 2.000-5.000 km; _long haul_ (>6 hrs) ≈ más de 5.000 km. Si conoces la duración real del vuelo, úsala.

💡 **Al final de la página hay un ejemplo ilustrativo.**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica todos los viajes laborales del año

Lista todos los viajes pagados o autorizados por la empresa:

- Visitas a clientes o proveedores
- Conferencias, ferias, congresos
- Capacitaciones o entrenamientos
- Reuniones interregionales

⚠️ **No incluyas commuting** (eso va en la sub-categoría correspondiente).

---

### 2️⃣ Recolecta los datos

Las fuentes principales:

- **Plataformas de booking corporativo** (entregan reportes con km, modo, clase)
- **Boarding passes / itinerarios** (para vuelos)
- **Rendiciones de gastos** de viajes
- **Tarjetas de crédito corporativas** (si pagan vuelos)
- **Apps de Uber/Cabify** (historial corporativo)

Datos mínimos por viaje:

- **Modo** (avión, bus, tren, taxi, auto arrendado)
- **Clase** (en aéreo: Economy o Business)
- **Origen y destino** (o km recorridos)
- **Tramos:** ¿fue solo ida o ida y vuelta?
- **N° de personas** que hicieron ese viaje

💡 Con esos cinco datos puedes aplicar directamente la fórmula práctica de arriba.

---

### 3️⃣ Si no tienes el dato exacto

#### **Opción 1:** Distancia geográfica

Si tienes origen y destino pero no los km, calcula con Google Maps o herramientas como [Great Circle Mapper](https://www.gcmap.com/).

⚠️ Estas herramientas devuelven la distancia **de un tramo**. Recuerda duplicarla si el viaje fue ida y vuelta.

---

#### **Opción 2:** Calculadora ICAO

Para vuelos comerciales, usa la **calculadora oficial ICAO** que ajusta por modelo de avión, ocupación y otros factores. Su resultado ya viene **por pasajero**.

---

#### **Opción 3:** Estimación por gasto

Si solo tienes el monto pagado en pasajes:

> **km estimados** ≈ $\frac{Gasto}{Tarifa\ promedio\ por\ km\ del\ modo}$

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir las cantidades**

Debes rellenar los siguientes campos:

| Campo      | Qué debes ingresar                                                               |                                            Ejemplo |
| :--------- | :------------------------------------------------------------------------------- | -------------------------------------------------: |
| Transporte | Modo y clase, elegido de la lista                                                | Transporte en avión: Medium haul (3-6 hrs) Economy |
| Unidad     | Unidad de distancia (km, m o mi)                                                 |                                                 km |
| Cantidad   | Distancia total anual: km × tramos × personas × viajes (personas solo si aplica) |                                          16.800 km |

⚠️ Ingresa **una línea por cada opción de Transporte** que hayas usado. Los vuelos se separan por tramo (short/medium/long haul) y por clase (Economy/Business), porque cada combinación tiene su propio factor.

⚠️ El campo **"Fuente factor" no debes modificarlo**

⚠️ Si el transporte que utilizaste no está en la lista, selecciona **Otro** y declara tu propio factor de emisión en **"Fuente factor" → "Otro"**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Rellena los campos igual que en el Caso 1.

2.- En el campo **"Fuente factor"**, selecciona **"Otro"**.

3.- Modifica el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado (ej. resultado de calculadora ICAO).

⚠️ Si usas un factor propio, revisa si está expresado **por pasajero-km o por vehículo-km** y ajusta la cantidad en consecuencia.

---

**CASO 3:** Hiciste el cálculo por fuera y **ya tienes las emisiones totales de la sub-categoría**

Accede a la calculadora en **modo experto**. En el paso 3, selecciona el checkbox **"Sólo quiero ingresar el total de emisiones"**.

---

### 📌 Ejemplo práctico

Supongamos una **consultora** que durante el año tuvo:

- **Congreso internacional:** 3 personas, vuelo de 9.500 km por tramo, ida y vuelta, Economy (long haul)
- **Visitas a clientes en la región:** 4 viajes de 1 persona, 2.100 km por tramo, ida y vuelta, Economy (medium haul)
- **Vuelos domésticos:** 3 viajes de 2 personas, 620 km por tramo, ida y vuelta, Economy (short haul)
- **Bus interurbano:** 1 viaje de 5 personas, 225 km por tramo, ida y vuelta
- **Taxis en destino:** 20 viajes de 30 km, con 2 personas en cada uno
- **Auto arrendado:** 800 km recorridos por el vehículo

Primero se calcula la **cantidad** de cada línea:

| Transporte                | Cálculo de la cantidad                          |  Cantidad |
| :------------------------ | :---------------------------------------------- | --------: |
| Avión Long haul Economy   | 9.500 km × 2 tramos × 3 personas × 1 viaje      | 57.000 km |
| Avión Medium haul Economy | 2.100 km × 2 tramos × 1 persona × 4 viajes      | 16.800 km |
| Avión Short haul Economy  | 620 km × 2 tramos × 2 personas × 3 viajes       |  7.440 km |
| Bus                       | 225 km × 2 tramos × 5 personas × 1 viaje        |  2.250 km |
| Taxi                      | 30 km × 1 tramo × 2 personas × 20 viajes        |  1.200 km |
| Auto                      | km del vehículo (sin multiplicar por ocupantes) |    800 km |

Y luego las emisiones:

| Transporte                | Cantidad (km) | Factor (kg CO₂e/km) |     Emisiones |
| :------------------------ | ------------: | ------------------: | ------------: |
| Avión Long haul Economy   |        57.000 |              0,1091 | 6.219 kg CO₂e |
| Avión Medium haul Economy |        16.800 |              0,1170 | 1.966 kg CO₂e |
| Avión Short haul Economy  |         7.440 |              0,1257 |   935 kg CO₂e |
| Bus                       |         2.250 |              0,1038 |   234 kg CO₂e |
| Taxi                      |         1.200 |              0,1480 |   178 kg CO₂e |
| Auto                      |           800 |              0,1730 |   138 kg CO₂e |

**Total: ~9.670 kg CO₂e al año (~9,7 ton CO₂e)**

> 💡 Fíjate en los dos efectos que más confunden:
>
> - El congreso internacional pesa el **64% del total** no porque el vuelo sea el más caro por km (de hecho es el factor aéreo **más bajo**), sino porque **3 personas × 2 tramos × 9.500 km** genera 57.000 pasajeros-km.
> - El auto arrendado se ingresa con los km del vehículo aunque viajen varias personas, porque su factor es del vehículo completo. El taxi, en cambio, se multiplica por las personas: su factor es por pasajero.

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en kg CO₂e/km, la cantidad debe estar en km.

---

## 📝 Notas importantes

> - **Pasajero-km vs vehículo-km:** avión, bus, tren y taxi se multiplican por el número de pasajeros; el auto no. Es el error más común al declarar esta sub-categoría
> - **Cuenta ida y vuelta:** salvo que el viaje haya sido efectivamente solo de ida, la distancia se duplica
> - **En Economy, los vuelos cortos tienen factor mayor por km** que los largos: el despegue y aterrizaje son las fases más intensivas y se reparten en menos kilómetros
> - **La clase ya está en el factor:** Business no se multiplica aparte. En vuelos medium y long haul el factor Business casi triplica al Economy, así que **bajar de clase es una palanca real de reducción**
> - **Radiative forcing index (RFI):** la plataforma aplica el factor DEFRA 2025 tal como está. Si tu metodología exige un ajuste adicional por el efecto de las emisiones en altitud, hazlo con la fuente de factor **"Otro"** en lugar de modificar la cantidad
> - **No dupliques con commuting:** commuting es el desplazamiento **diario** casa-trabajo. Esta sub-categoría es para **viajes específicos** por trabajo
> - **No dupliques con Alcance 1:** si la empresa tiene **flota propia** de autos corporativos y los usa en viajes, eso es Alcance 1 (combustión móvil), no aquí
> - **Vehículos arrendados (rent-a-car):** sí van aquí (no es flota propia)
> - **No dupliques con Estadía:** el alojamiento del viaje va en la sub-categoría _Viajes de negocios — Estadía_
> - **Reducciones efectivas:** videoconferencias en lugar de viajes, agrupación de viajes a una región, enviar menos personas al mismo destino, viajar en clase economy en vez de business
> - Guarda **boarding passes, itinerarios, recibos y reportes de booking corporativo** como respaldo
$md$::text AS "content")
UPDATE "subcategory" s
SET "explanation" = guide."content"
FROM guide, "category" c
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE s."category_id" = c."id"
  AND c."name" = 'Otras emisiones indirectas' AND mv."name" = 'Metodología inicial' AND co."iso_code" = 'PD'
  AND s."name" = 'Viajes de negocios - Traslado' AND s."status" <> 'DELETED'
  AND s."explanation" IS DISTINCT FROM guide."content";
