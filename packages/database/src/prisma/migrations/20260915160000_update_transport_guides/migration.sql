-- Refresh the three transport guides on databases that were already seeded.
--
-- The seed cannot do this. seed.ts aborts the whole run when the database
-- already contains data (the country-count gate), so seedExplanations never
-- re-inlines a markdown file that changed after the first seed: an installed
-- deployment keeps serving the text it was seeded with. This migration writes
-- the current file content onto each row, so the (i) panel matches the
-- repository and a later reseed is a no-op.
--
-- What changed in the text (see the accompanying seed data commit). All three
-- guides now follow the rule the reviewers asked for: the worked example ends
-- at the number the user types into "Cantidad", not at the emissions the
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
--    "peso transportado x distancia", the shape that produces the most common
--    error found in verification: summing every weight, summing every distance
--    and multiplying the two. Both now compute ton-km per trip and sum the
--    ton-km, group trips that share a route, and close the example by showing
--    the inflated figure the wrong order produces (about 6x upstream, about
--    200x downstream). The totals and emissions of both examples are unchanged
--    -- the trips were chosen to add up to the same numbers -- so only the
--    method being taught is different.
--
-- Same shape as 20260825150000_update_business_travel_transport_explanation,
-- whose treatment of the passenger-km/vehicle-km question these guides now
-- match: each row is matched through the demo country's base methodology, so a
-- country deployment that maintains its own methodology decides for itself,
-- and every write is guarded by IS DISTINCT FROM, so re-running the migration
-- touches zero rows.
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
| Taxi/Ride-share      | Gasolina    |               0.149 | vehículo            |
| Taxi/Ride-share      | Eléctrico   |               0.060 | vehículo            |
| Taxi/Ride-share      | Híbrido     |               0.110 | vehículo            |
| Bici                 | No aplica   |               0.000 | persona             |
| Caminata             | No aplica   |               0.000 | persona             |

### 🔑 Las tres dudas más frecuentes

**1️⃣ ¿Ingreso los kilómetros de una persona o de todas?**

De **todas**, y son los del **año completo**. La cantidad es siempre el total anual recorrido por todas las personas que usaron ese modo. La plataforma no multiplica por el número de empleados: ese cálculo lo haces tú antes de escribir la cantidad.

**2️⃣ ¿Multiplico por el número de personas? Depende del modo.**

Esta es la duda que produce los errores más grandes, en las dos direcciones:

- 🚌 **Bus, 🚇 metro y 🚂 tren:** el factor es **por pasajero**. Multiplica la distancia por el número de personas. Si 10 empleados hacen 15 km diarios en metro durante 200 días, ingresas **30.000 km**.
- 🚗 **Auto, 🏍️ moto y 🚕 taxi:** el factor es **por vehículo**, no por ocupante. Cuentas los kilómetros que recorrió **cada vehículo una sola vez**, sin importar cuánta gente iba dentro.

**3️⃣ ¿Y si dos empleados comparten el auto?**

Ese auto se cuenta **una sola vez**. Dos personas que viajan juntas en un auto generan las emisiones de **un** auto, no de dos: el factor ya es del vehículo completo. Al revés también importa — quien viaja solo carga con todas las emisiones de su vehículo, no con una fracción.

> ⚠️ El efecto es grande. Diez empleados que llegan cada uno en su auto son diez vehículos; los mismos diez repartidos en tres autos compartidos son **tres**. Si cuentas "10 personas × su distancia" en un modo por vehículo, sobreestimas más del triple.

### 🧮 La fórmula práctica para obtener la cantidad

> **Bus / metro / tren** (factor por pasajero):
> $Cantidad$ = $km\ ida\ y\ vuelta \times días\ presenciales\ al\ año \times N°\ de\ personas$
>
> **Auto / moto / taxi** (factor por vehículo):
> $Cantidad$ = $km\ ida\ y\ vuelta \times días\ presenciales\ al\ año \times N°\ de\ vehículos$

En los modos por vehículo, **N° de vehículos** es la cantidad de autos, motos o taxis que efectivamente se movieron — no la cantidad de personas que viajaron en ellos.

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

| Campo       | Qué debes ingresar                                                                                                   |  Ejemplo |
| :---------- | :------------------------------------------------------------------------------------------------------------------- | -------: |
| Tipo        | Modo de transporte                                                                                                   |     Auto |
| Combustible | Combustible o variante (o "No aplica")                                                                               | Gasolina |
| Unidad      | Unidad de distancia (km, m o mi)                                                                                     |       km |
| Cantidad    | Distancia total del año: km ida y vuelta × días presenciales × personas (o × vehículos si el factor es por vehículo) | 8.712 km |

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

> - **Pasajero-km vs vehículo-km:** bus, metro y tren se multiplican por el número de personas; auto, moto y taxi no. Es el error más común al declarar esta sub-categoría, y el que un verificador detecta primero
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
