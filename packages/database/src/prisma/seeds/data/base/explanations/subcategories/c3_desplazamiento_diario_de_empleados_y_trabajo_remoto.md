# 🚌 Desplazamiento diario de empleados y trabajo remoto

Esta sub-categoría incluye las emisiones asociadas al **traslado cotidiano de los empleados entre su hogar y el lugar de trabajo (commuting)**, así como al **consumo energético del hogar** atribuible a las horas de **trabajo remoto (home office)**.

Cubre todos los modos de transporte usados por los empleados:

- 🚗 Auto particular
- 🚌 Bus / transporte público
- 🚇 Metro / tren
- 🏍️ Moto
- 🚲 Bicicleta (factor 0 generalmente)
- 🚶 Caminata (factor 0)
- 🚐 Acercamiento corporativo (si lo paga la empresa)

Para **trabajo remoto**, cubre el consumo eléctrico del hogar (luz, computador, climatización) atribuible a las horas trabajadas.

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa **tiene empleados** que se desplazan a una oficina, planta o local?
- ¿Tus empleados usan **auto particular, bus, metro, moto o bicicleta** para llegar al trabajo?
- ¿Conoces o puedes estimar la **distancia promedio** del trayecto de tus empleados?
- ¿Tu empresa tiene empleados en **modalidad híbrida o 100% remota**?
- ¿Cubres algún **acercamiento, viático de transporte o estacionamiento**?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

> Para empresas de **servicios** (consultoras, estudios, software), commuting suele ser una de las fuentes más significativas del Alcance 3.

---

## ¿Cómo es el cálculo de emisiones?

**Para commuting:**

> $CO₂e$ = $Distancia\ anual\ recorrida \times Factor\ por\ modo$

Por empleado: distancia ida y vuelta × días presenciales/año.

**Para trabajo remoto (WFH):**

> $CO₂e$ = $Días\ remotos \times Consumo\ eléctrico\ promedio \times Factor\ de\ la\ red$

| Modo                       | Factor referencial                                      |
| :------------------------- | :------------------------------------------------------ |
| Auto particular (gasolina) | 0,18 kg CO₂e/km                                         |
| Auto particular (diésel)   | 0,17 kg CO₂e/km                                         |
| Bus urbano                 | 0,07 kg CO₂e/km/persona                                 |
| Metro / tren               | 0,04 kg CO₂e/km/persona                                 |
| Moto                       | 0,10 kg CO₂e/km                                         |
| Bicicleta / caminata       | 0                                                       |
| WFH                        | ~1-3 kg CO₂e/día (varía por matriz energética del país) |

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
- ¿Cuántos días trabajas desde casa?

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

#### **Opción 3:** Estimación rápida WFH

> $Emisiones\ WFH$ = $Días\ remoto/año \times 1\ a\ 3\ kg\ CO₂e/día$

El valor exacto depende del **factor de la red eléctrica del país** donde reside el empleado.

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir las cantidades**

Debes rellenar los siguientes campos:

| Campo              | Qué debes ingresar                 |                 Ejemplo |
| :----------------- | :--------------------------------- | ----------------------: |
| Tipo               | Commuting o Trabajo remoto         |               Commuting |
| Modo de transporte | Modo dominante o desglose por modo | Auto, Bus, Metro, Mixto |
| Unidad             | Unidad en la que declaras          |     km/año, persona-día |
| Cantidad           | Total anual de la flota laboral    |           72.000 km/año |

⚠️ Si tienes desglose por modo, ingresa una línea por modo.

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

Supongamos una **consultora de 15 empleados** en modalidad híbrida (3 días presencial, 2 remoto):

**Commuting:**

- Distancia promedio ida y vuelta: 22 km
- Días presenciales/año: 3 días/semana × 44 semanas = 132 días
- Modo dominante: 70% auto, 30% transporte público

> Auto: $15 \times 0,7 \times 22\ km \times 132\ días \times 0,18\ kg/km$ = **5.488 kg CO₂e**
>
> Transporte público: $15 \times 0,3 \times 22\ km \times 132\ días \times 0,07\ kg/km$ = **915 kg CO₂e**
>
> **Subtotal commuting: ~6.400 kg CO₂e**

**WFH:**

- Días remotos/año: 15 emp × 2 días/semana × 44 semanas = **1.320 días-persona**
- Factor estimado: **1,2 kg CO₂e/día**

> WFH: $1.320 \times 1,2$ = **1.584 kg CO₂e**

**Total sub-categoría: ~7.984 kg CO₂e al año (~8,0 ton CO₂e)**

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en kg CO₂e/km, la cantidad debe estar en km.

---

## 📝 Notas importantes

> - **Diferencia con Alcance 1:** si el empleado se mueve en un **vehículo corporativo**, eso es Alcance 1 (combustión móvil), no commuting. Solo cuenta acá si usa **medios propios o de terceros**
> - **Diferencia con Viajes de negocios:** commuting es el desplazamiento **cotidiano casa-trabajo**. Los viajes laborales puntuales (a otra ciudad, a un cliente, etc.) van en **Viajes de negocios — Traslado**
> - **Reportar WFH es opcional** en muchos estándares pero recomendado, especialmente si tienes alto % de empleados remotos
> - **Encuesta anual:** repítela cada año o cuando haya cambios significativos (mudanza de oficina, cambios de modalidad, expansión de equipo)
> - **Bicicleta y caminata:** factor 0, pero igual incluye los empleados en la encuesta para entender la distribución
> - **Acercamiento corporativo:** si tu empresa contrata buses para llevar empleados, esas emisiones también van aquí (o en Alcance 1 si es flota propia)
> - Guarda los **resultados de la encuesta** y la metodología como respaldo
