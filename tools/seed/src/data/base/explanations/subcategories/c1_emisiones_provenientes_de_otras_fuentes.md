# 🌱 Emisiones provenientes de otras fuentes

Esta sub-categoría es **residual**: incluye **cualquier otra fuente de emisión que ocurra dentro de los límites físicos de la empresa y bajo su control operativo**, y que no encaje en las sub-categorías estándar de Alcance 1 (combustiones estacionarias, móviles, fugitivas o procesos industriales).

Ejemplos típicos:

- 🐄 Emisiones biogénicas por **ganadería** (fermentación entérica, manejo de estiércol)
- 💧 Emisiones de **plantas de tratamiento de aguas residuales (RILes)** propias, especialmente las anaeróbicas
- ♻️ **Compostaje en sitio** de residuos orgánicos
- 🌾 **Aplicación de fertilizantes nitrogenados** en terrenos propios
- 🧯 Activación de **extintores de CO₂** o equivalentes
- 🪵 **Descomposición controlada** de biomasa (forestal, agrícola)
- 🏚️ Operación de **rellenos sanitarios o vertederos** dentro del predio

Corresponde a fuentes donde la empresa **administra y controla directamente** el proceso o la instalación que genera las emisiones, pero estas no derivan de la combustión de combustibles ni de las otras sub-categorías estándar.

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa tiene **ganado o producción animal** en sus instalaciones?
- ¿Operas **planta de tratamiento de aguas residuales** propia (lagunas anaeróbicas, biodigestores)?
- ¿Realizas **compostaje en sitio** o tienes acumulación de materia orgánica en descomposición?
- ¿**Aplicas fertilizantes nitrogenados** en terreno propio (agricultura)?
- ¿Tienes **rellenos sanitarios, vertederos o pozos sépticos** dentro de tu predio?
- ¿Hay alguna fuente atípica bajo tu control operativo que **no encaje** en otras sub-categorías?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

⚠️ Esta sub-categoría es **residual**: úsala solo cuando la fuente no encaje en combustiones estacionarias, móviles, fugitivas o procesos industriales. **Las otras sub-categorías tienen prioridad.**

---

## ¿Cómo es el cálculo de emisiones?

El cálculo sigue la lógica general:

> $CO₂e$ = $Cantidad\ de\ actividad \times Factor\ de\ emisión$

Lo que cambia es la **unidad de actividad** según el tipo de fuente:

| Tipo de fuente    | Unidad de actividad    | Factor típico     |
| :---------------- | :--------------------- | :---------------- |
| Ganadería         | N° animales/año        | kg CH₄/animal/año |
| RILes anaeróbicos | m³ tratados            | kg CH₄/m³         |
| Compostaje        | kg materia orgánica    | kg CH₄/kg         |
| Fertilizantes     | kg N aplicado          | kg N₂O/kg N       |
| Extintores CO₂    | kg de carga descargada | kg CO₂e/kg        |

💡 **Al final de la página hay un ejemplo ilustrativo.**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica las fuentes residuales bajo tu control

Revisa todas las actividades que ocurren dentro de tus instalaciones y verifica si:

- Generan emisiones de gases de efecto invernadero
- **No** son combustiones estacionarias, móviles, fugitivas o procesos industriales

⚠️ Solo incluye fuentes bajo **control operativo** de tu empresa.

---

### 2️⃣ Recolecta la información de actividad

Las fuentes de datos varían según el tipo:

- **Ganadería:** registros de inventario animal, planillas zootécnicas
- **RILes:** registros del operador de la planta, monitoreo continuo
- **Compostaje:** balances de materia orgánica gestionada
- **Fertilizantes:** órdenes de compra, planillas de aplicación
- **Extintores:** registros de mantención y recarga

⚠️ Si no tienes el dato exacto, puedes hacer **estimaciones razonables** y declarar los supuestos utilizados.

---

### 3️⃣ Si no tienes el dato exacto

#### **Opción 1:** Promedios sectoriales

Para ganadería o agricultura, usa promedios del rubro y multiplica por tu escala (cabezas, hectáreas).

---

#### **Opción 2:** Valores de diseño

Para RILes o compostaje, usa los valores de diseño del sistema (capacidad nominal × % utilización).

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir la cantidad** y la fuente de emisión

Debes rellenar los siguientes campos:

| Campo          | Qué debes ingresar        |                                                 Ejemplo |
| :------------- | :------------------------ | ------------------------------------------------------: |
| Tipo de fuente | Categoría general         | Ganadería, RILes, Compostaje, Fertilización, Extintores |
| Sub-tipo       | Detalle dentro del tipo   |  Bovino lechero, Laguna anaeróbica, Compostaje aeróbico |
| Unidad         | Unidad en la que declaras |                                N° animales, m³, kg, ton |
| Cantidad       | Total anual               |                        50 animales, 12.000 m³, 3.000 kg |

⚠️ El campo **"Fuente factor" no debes modificarlo**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Rellena los campos igual que en el Caso 1.

2.- Luego, en el campo **"Fuente factor"**, selecciona **"Factor propio"**.

3.- Modifica el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado.

---

**CASO 3:** Hiciste el cálculo por fuera y **ya tienes las emisiones totales de la sub-categoría**

Accede a la calculadora en **modo experto**. En el paso 3, selecciona el checkbox **"Sólo quiero ingresar el total de emisiones"**.

---

### 📌 Ejemplo práctico

Supongamos que tu empresa es una **lechería** con **50 vacas lecheras** durante el año.

El factor de emisión por fermentación entérica de bovino lechero es (referencial):

- Por cada animal/año, se generan ~**2.800 kg CO₂e** (combinando CH₄ entérico y manejo de estiércol)

Entonces el cálculo sería:

> $CO₂e$ = $50\ animales \times 2.800\ kg\ CO₂e/animal/año$ = $140.000\ kg\ CO₂e$

Es decir, las "otras fuentes" habrían generado:

- **140.000 kg CO₂e** en el año
- O lo mismo que **140 toneladas de CO₂e**

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está por animal/año, la cantidad debe ser N° de animales presentes durante un año (promedio).

---

## 📝 Notas importantes

> - Esta sub-categoría es **residual**: las otras sub-categorías de Alcance 1 (estacionarias, móviles, fugitivas, procesos) tienen prioridad. Úsala solo cuando no haya mejor encaje
> - **Documenta tus supuestos.** Las fuentes residuales suelen requerir más estimaciones que las estándar — anota metodología, factores y referencias
> - **No incluyas combustibles** quemados (van en estacionarias o móviles) ni refrigerantes (van en fugitivas)
> - Si la fuente es **muy material**, considera hacer medición in situ o contratar a un especialista en GEI para refinar el cálculo
> - **Guarda registros** de actividad como respaldo para auditorías o certificaciones
