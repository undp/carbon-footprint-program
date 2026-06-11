# 💻 Trabajo remoto de empleados

Esta sub-categoría incluye las emisiones asociadas al **consumo energético del hogar** atribuible a las horas en que los empleados trabajan en modalidad remota (teletrabajo / home office).

Se desglosa en tres **componentes** del consumo eléctrico del hogar:

- 🖥️ **Equipo de oficina** (computador, monitor, periféricos, iluminación)
- 🔥 **Calefacción** (consumo invernal del hogar atribuible a las horas trabajadas)
- ❄️ **Refrigeración** (consumo estival del hogar atribuible a las horas trabajadas)

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa tiene empleados en **modalidad híbrida o 100% remota**?
- ¿Conoces o puedes estimar la **cantidad de horas anuales** trabajadas desde el hogar por tu equipo?
- ¿Tus empleados utilizan **calefacción o refrigeración** en sus hogares durante la jornada laboral?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

> Para empresas de **servicios** (consultoras, estudios, software) con alta proporción de teletrabajo, esta sub-categoría puede ser relevante en el Alcance 3.

---

## ¿Cómo es el cálculo de emisiones?

La plataforma trabaja con **cantidades agregadas a nivel organización**, no por empleado individual. Para cada componente, suma las horas anuales totales trabajadas desde el hogar por todo tu equipo y se multiplica por el factor correspondiente:

> $CO_2e$ = $Horas\ anuales\ agregadas\ (h) \times Factor\ por\ Componente\ (kg\ CO_2e/h)$

Factores referenciales (EcoAct 2020):

| Componente        | Factor (kg CO₂e/h) |
| :---------------- | -----------------: |
| Equipo de oficina |              0.057 |
| Calefacción       |              0.300 |
| Refrigeración     |              0.122 |

> El factor de **Equipo de oficina** aplica todas las horas remotas trabajadas; los factores de **Calefacción** y **Refrigeración** aplican solo a las horas en que efectivamente se usan estos equipos (típicamente acotadas por temporada climática).

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica horas remotas anuales

- Total de empleados con teletrabajo (parcial o total)
- Días remotos/año por empleado
- Horas remotas/día (típicamente 8 h)
- Total horas remotas agregadas = empleados × días remotos × horas/día

---

### 2️⃣ Estima horas con uso de calefacción y refrigeración

No todas las horas remotas implican consumo de calefacción o refrigeración. Estima la fracción según clima local:

- **Calefacción:** meses fríos del año (típicamente abril-septiembre en hemisferio sur, octubre-marzo en hemisferio norte)
- **Refrigeración:** meses cálidos del año

> Si no tienes datos detallados, una estimación conservadora es asumir que **el 30-40% de las horas remotas** usan calefacción o refrigeración según la temporada.

---

### 3️⃣ Ingreso de la información

Por cada componente que aplique, agrega una línea con:

| Campo      | Qué debes ingresar                                             |           Ejemplo |
| :--------- | :------------------------------------------------------------- | ----------------: |
| Componente | Equipo de oficina, Calefacción o Refrigeración                 | Equipo de oficina |
| Unidad     | h                                                              |                 h |
| Cantidad   | Horas anuales agregadas del equipo aplicables a ese componente |      16.500 h/año |

⚠️ El campo **"Fuente factor" no debes modificarlo**, salvo que uses factores propios.

---

### 📌 Ejemplo práctico

Supongamos una **consultora de 15 empleados** en modalidad híbrida (2 días remotos/semana × 44 semanas × 8 h/día):

- Horas remotas anuales agregadas: $15 \times 2 \times 44 \times 8$ = **10.560 h**
- Calefacción aplicable: ~35% del año → **3.696 h**
- Refrigeración aplicable: ~30% del año → **3.168 h**

> Equipo de oficina: $10.560 \times 0,057$ ≈ **602 kg CO₂e**
>
> Calefacción: $3.696 \times 0,300$ ≈ **1.109 kg CO₂e**
>
> Refrigeración: $3.168 \times 0,122$ ≈ **386 kg CO₂e**
>
> **Total trabajo remoto: ~2.097 kg CO₂e**

---

## 📝 Notas importantes

> - **Diferencia con commuting:** los traslados casa-trabajo se reportan en la sub-categoría **"Desplazamiento diario de empleados"**, no aquí.
> - **Reportar trabajo remoto es opcional** en muchos estándares pero recomendado, especialmente si tienes un alto porcentaje de empleados en modalidad remota.
> - **Factor de red eléctrica:** los factores referenciales asumen un mix energético genérico. En implementaciones con factor de red local disponible, ajusta los valores.
> - **Encuesta anual:** repítela cada año o cuando haya cambios significativos en la política de trabajo remoto.
> - Guarda los **resultados de la encuesta** y la metodología como respaldo.
