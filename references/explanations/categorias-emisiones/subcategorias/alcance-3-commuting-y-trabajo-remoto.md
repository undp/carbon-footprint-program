# Desplazamiento diario de empleados y trabajo remoto

Emisiones asociadas al **traslado cotidiano de los empleados** entre su hogar y el lugar de trabajo, y al **consumo energético del hogar** atribuible a las horas de trabajo remoto.

## 🚌 Desplazamiento diario y trabajo remoto

Esta sub-categoría incluye los **viajes diarios de los trabajadores** entre su hogar y el lugar de trabajo (commuting), así como las emisiones del **trabajo desde casa** (home office) cuando aplica.

Cubre todos los modos de transporte usados por los empleados:

- 🚗 Auto particular
- 🚌 Bus / transporte público
- 🚇 Metro / tren
- 🏍️ Moto
- 🚲 Bicicleta (factor 0 generalmente)
- 🚶 Caminata (factor 0)
- 🚐 Acercamiento corporativo (si lo paga la empresa)

Para **trabajo remoto**, cubre el consumo eléctrico del hogar (luz, computador, climatización) atribuible a las horas trabajadas.

Corresponde a Alcance 3, Categoría 3 de ISO 14064-1.

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa **tiene empleados** que se desplazan a una oficina, planta o local?
- ¿Tus empleados usan **auto particular, bus, metro, moto o bicicleta** para llegar al trabajo?
- ¿Conoces o puedes estimar la **distancia promedio** del trayecto de tus empleados?
- ¿Tu empresa tiene empleados en **modalidad híbrida o 100% remota**?
- ¿Cubres algún **acercamiento, viático de transporte o estacionamiento**?

### 💡 Tip importante

Si la respuesta a una o más de estas preguntas es **SÍ**, tu empresa probablemente debe medir y declarar emisiones en esta sub-categoría.

> Para empresas de **servicios** (consultoras, estudios, software), commuting suele ser una de las fuentes más significativas del Alcance 3.

## ¿Cómo es el cálculo de emisiones?

**Para commuting:**

**CO₂eq = Distancia anual recorrida × Factor de emisión por modo**

Por empleado: distancia ida y vuelta × días presenciales/año

**Para trabajo remoto (WFH):**

**CO₂eq = Días remotos × Consumo eléctrico promedio × Factor de la red eléctrica**

| Modo                       | Factor referencial                                                             |
| -------------------------- | ------------------------------------------------------------------------------ |
| Auto particular (gasolina) | 0,18 kg CO₂eq/km                                                               |
| Auto particular (diésel)   | 0,17 kg CO₂eq/km                                                               |
| Bus urbano                 | 0,07 kg CO₂eq/km/persona                                                       |
| Metro / tren               | 0,04 kg CO₂eq/km/persona                                                       |
| Moto                       | 0,10 kg CO₂eq/km                                                               |
| Bicicleta / caminata       | 0                                                                              |
| WFH                        | ~1-3 kg CO₂eq/día (varía por país: Perú/Ecuador extremo bajo, RD extremo alto) |

> 💡 Al final de la página hay un ejemplo ilustrativo.

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica tu fuerza laboral

- Total de empleados
- Modalidad: presencial / híbrido / 100% remoto
- Días presenciales por semana (en híbridos)
- Días al año efectivamente trabajados (descontando vacaciones, feriados, licencias)

### 2️⃣ Recolecta los datos de transporte

La fuente más confiable es una **encuesta interna** anual. Pregunta a cada empleado:

- ¿Cómo te trasladas habitualmente al trabajo?
- ¿Cuántos km hay (ida y vuelta) entre tu casa y el trabajo?
- ¿Cuántos días a la semana asistes presencialmente?
- ¿Cuántos días trabajas desde casa?

⚠️ Si la encuesta tiene baja tasa de respuesta, extrapola con los datos disponibles y declara el supuesto.

### 3️⃣ Si no tienes encuesta o datos detallados

**Opción 1: Estimación por ubicación de residencia**

Si conoces la comuna, distrito, municipio o código postal de cada empleado, puedes estimar la distancia hasta la oficina con Google Maps o herramientas geo.

**Opción 2: Promedios nacionales o de la ciudad**

La distancia promedio al trabajo en grandes ciudades de la región (Lima, Santiago, Quito, Guayaquil, Santo Domingo) suele estar en **8-15 km** (ida). El **mix de modos** varía mucho por ciudad — busca estadísticas locales si están disponibles. Si no, aplica una mezcla razonable:

> Ejemplo (gran ciudad de la región): 40-60% transporte público, 30-50% auto/moto, 5-10% otros (a pie, bici)

**Opción 3: Estimación rápida WFH**

> Días remoto/año × 1-3 kg CO₂eq/día (rango aproximado para los países de la región)
>
> El valor exacto depende del **factor de la red eléctrica del país**:
>
> - Perú (~0,25 kg/kWh) y Ecuador (~0,30): extremo bajo
> - Chile (~0,35): rango medio
> - República Dominicana (~0,55): extremo alto

### 4️⃣ Ingreso de la información

**CASO 1: Eres novato y solo quieres introducir las cantidades**

Debes rellenar los siguientes campos:

| Campo              | Qué debes ingresar                 | Ejemplo                 |
| ------------------ | ---------------------------------- | ----------------------- |
| Tipo               | Commuting o Trabajo remoto         | Commuting               |
| Modo de transporte | Modo dominante o desglose por modo | Auto, Bus, Metro, Mixto |
| Unidad             | Unidad en la que declaras          | km/año, persona-día     |
| Cantidad           | Total anual de la flota laboral    | 72.000 km/año           |

⚠️ Si tienes desglose por modo, ingresa una línea por modo.

💡 Si la plataforma te sugiere un factor de emisión, puedes utilizarlo para hacer los cálculos. Si no hay un factor sugerido, debes buscar uno que aplique apropiadamente a tu caso.

**CASO 2: Eres experto y utilizas factores propios**

1. Rellena los campos como en el Caso 1.
2. En **"Fuente factor"** selecciona **"Factor propio"**.
3. Modifica el campo **"Factor kgCO₂/unidad"** con tu valor personalizado.

**CASO 3: Hiciste el cálculo por fuera y ya tienes el total**

Accede a la calculadora en **modo experto**. En el paso 3, selecciona el checkbox **"Sólo quiero ingresar el total de emisiones"**.

## 📌 Ejemplo práctico

Supongamos una **consultora de 15 empleados** en Lima (Perú), modalidad híbrida (3 días presencial, 2 remoto):

**Commuting:**

- Distancia promedio ida y vuelta: 22 km
- Días presenciales/año: 3 días/semana × 44 semanas = 132 días
- Modo dominante: 70% auto, 30% transporte público

> Auto: 15 emp × 0,7 × 22 km × 132 días × 0,18 kg/km = **5.488 kg CO₂eq**
> Transporte público: 15 emp × 0,3 × 22 km × 132 días × 0,07 kg/km = **915 kg CO₂eq**
> **Subtotal commuting: ~6.400 kg CO₂eq**

**WFH:**

- Días remotos/año: 15 emp × 2 días/semana × 44 semanas = 1.320 días-persona
- Factor estimado para Perú (matriz hidráulica + gas): **1,2 kg CO₂eq/día**

> WFH: 1.320 × 1,2 = **1.584 kg CO₂eq**

**Total sub-categoría: ~7.984 kg CO₂eq al año (~8,0 ton CO₂eq)**

> ⚠️ **Es importante que las unidades coincidan.** Si el factor está en kg CO₂eq/km, la cantidad debe estar en km.

## 📝 Notas importantes

- **Diferencia con Alcance 1:** si el empleado se mueve en un **vehículo corporativo**, eso es Alcance 1 (combustión móvil), no commuting. Solo cuenta acá si usa **medios propios o de terceros**.
- **Diferencia con Viajes de negocios:** commuting es el desplazamiento **cotidiano casa-trabajo**. Los viajes laborales puntuales (a otra ciudad, a un cliente, etc.) van en **Viajes - Traslado**.
- **Reportar WFH es opcional** en muchos estándares pero recomendado, especialmente si tienes alto % de empleados remotos.
- **Encuesta anual:** repítela cada año o cuando haya cambios significativos (mudanza de oficina, cambios de modalidad, expansión de equipo).
- **Bicicleta y caminata:** factor 0, pero igual incluye los empleados en la encuesta para entender la distribución.
- **Acercamiento corporativo:** si tu empresa contrata buses para llevar empleados, esas emisiones también van en commuting (o en transporte propio si es tu flota).
- Guarda los **resultados de la encuesta** y la metodología como respaldo.
