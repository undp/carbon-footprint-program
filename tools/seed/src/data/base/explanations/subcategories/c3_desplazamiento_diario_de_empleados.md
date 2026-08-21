# 🚌 Desplazamiento diario de empleados

Esta sub-categoría incluye las emisiones asociadas al **traslado cotidiano de los empleados entre su hogar y el lugar de trabajo (commuting)**.

Cubre todos los modos de transporte que usan los empleados, con desglose de **Tipo** y, cuando aplica, **Combustible**:

- 🚗 **Auto** (Gasolina, Diésel, Eléctrico, Híbrido)
- 🏍️ **Moto** (Gasolina, Eléctrico)
- 🚌 **Bus urbano** / **Bus interurbano**
- 🚇 **Metro**
- 🚡 **Teleférico**
- 🚕 **Taxi/vehículo de transporte individual** (Gasolina, Eléctrico, Híbrido)
- 🚲 **Bicicleta** (factor 0)
- 🚶 **Caminata** (factor 0)

> Para modos que no se desglosan por combustible (Bus, Metro, Teleférico, Bicicleta, Caminata), usa la variante **"No aplica"**.

> El **taxi, el motoconcho y los vehículos de plataformas digitales** se declaran juntos en **Taxi/vehículo de transporte individual**: hoy comparten un mismo factor de emisión, por lo que separarlos no cambiaría el resultado.

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa **tiene empleados** que se desplazan a una oficina, planta o local?
- ¿Tus empleados usan **auto, moto, bus, metro, teleférico, taxi, motoconcho, bicicleta o caminata** para llegar al trabajo?
- ¿Conoces o puedes estimar la **distancia recorrida en el año** por tus empleados en cada modo?
- ¿Cubres algún **acercamiento corporativo o viático de transporte**?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

> Para empresas de **servicios** (consultoras, estudios, software), el commuting suele ser una de las fuentes más significativas del Alcance 3.

---

## ¿Cómo es el cálculo de emisiones?

La plataforma trabaja con **cantidades agregadas a nivel organización**, no por empleado individual. Para cada combinación de **Tipo × Combustible** usada por tu equipo, suma el total anual de km y se multiplica por el factor correspondiente:

> $CO_2e$ = $Distancia\ anual\ agregada\ (km) \times Factor\ por\ Tipo\ y\ Combustible\ (kg\ CO_2e/km)$

Factores referenciales:

| Tipo                                   | Combustible | Factor (kg CO₂e/km) |
| :------------------------------------- | :---------- | ------------------: |
| Auto                                   | Gasolina    |               0.173 |
| Auto                                   | Diésel      |               0.166 |
| Auto                                   | Eléctrico   |               0.047 |
| Auto                                   | Híbrido     |               0.110 |
| Moto                                   | Gasolina    |               0.114 |
| Moto                                   | Eléctrico   |               0.030 |
| Bus urbano                             | No aplica   |               0.117 |
| Bus interurbano                        | No aplica   |               0.027 |
| Metro                                  | No aplica   |               0.041 |
| Teleférico                             | No aplica   |             0.02366 |
| Taxi/vehículo de transporte individual | Gasolina    |               0.149 |
| Taxi/vehículo de transporte individual | Eléctrico   |               0.060 |
| Taxi/vehículo de transporte individual | Híbrido     |               0.110 |
| Bicicleta                              | No aplica   |               0.000 |
| Caminata                               | No aplica   |               0.000 |

> El teleférico funciona con tracción eléctrica, por lo que su factor corresponde a la electricidad consumida por pasajero-kilómetro.

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
- Si usa auto, moto, taxi o motoconcho: ¿qué combustible o variante?

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

| Campo       | Qué debes ingresar                             |       Ejemplo |
| :---------- | :--------------------------------------------- | ------------: |
| Tipo        | Modo de transporte                             |          Auto |
| Combustible | Combustible o variante (o "No aplica")         |      Gasolina |
| Unidad      | km                                             |            km |
| Cantidad    | Total anual agregado de la flota laboral en km | 72.000 km/año |

⚠️ El campo **"Fuente factor" no debes modificarlo**, salvo que uses factores propios.

⚠️ Si el medio de transporte que usan tus empleados no está en la lista, selecciona **Otro** y declara tu propio factor de emisión en **"Fuente factor" → "Otro"**

---

### 📌 Ejemplo práctico

Supongamos una **consultora de 15 empleados** en modalidad híbrida (3 días presencial):

- Distancia promedio ida y vuelta: 22 km
- Días presenciales/año: 3 días/semana × 44 semanas = 132 días
- Modo: 70% auto gasolina, 30% bus urbano

> Auto/Gasolina: $15 \times 0,7 \times 22\ km \times 132\ días \times 0,173\ kg/km$ ≈ **5.276 kg CO₂e**
>
> Bus urbano/No aplica: $15 \times 0,3 \times 22\ km \times 132\ días \times 0,117\ kg/km$ ≈ **1.530 kg CO₂e**
>
> **Total commuting: ~6.806 kg CO₂e**

⚠️ Es importante que las **unidades coincidan**: el factor está en kg CO₂e/km, la cantidad debe estar en km.

---

## 📝 Notas importantes

> - **Diferencia con Alcance 1:** si el empleado se mueve en un **vehículo corporativo**, eso es Alcance 1 (combustión móvil), no commuting. Solo cuenta acá si usa **medios propios o de terceros**.
> - **Diferencia con Viajes de negocios:** commuting es el desplazamiento **cotidiano casa-trabajo**. Los viajes laborales puntuales (a otra ciudad, a un cliente, etc.) van en **Viajes de negocios — Traslado**.
> - **Trabajo remoto:** las emisiones del teletrabajo se reportan en la sub-categoría **"Trabajo remoto de empleados"**, no aquí.
> - **Bicicleta y caminata:** factor 0, pero igual incluye los empleados en la encuesta para entender la distribución.
> - **Acercamiento corporativo:** si tu empresa contrata buses para llevar empleados, esas emisiones también van aquí (o en Alcance 1 si es flota propia).
> - Guarda los **resultados de la encuesta** y la metodología como respaldo.
