# 🚌 Desplazamiento diario de empleados

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
