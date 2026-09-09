# 🥫 Procesos industriales – Aluminio

Esta sub-categoría corresponde a **las emisiones de proceso de la producción primaria de aluminio**: el CO₂ que se libera cuando **el ánodo de carbono se oxida** durante la electrólisis de la alúmina.

Está pensada para **fundiciones primarias de aluminio** que operan celdas de electrólisis.

⚠️ **El factor por defecto cubre solo el CO₂ del consumo de ánodo.** Las emisiones de **PFC** (CF₄ y C₂F₆), que se generan durante el **efecto ánodo**, **no están incluidas** y debes declararlas en una línea aparte con factor propio. Son gases de altísimo potencial de calentamiento: en muchas plantas representan una fracción relevante del total.

⚠️ No debes incluir aquí:

- Consumo eléctrico de las celdas, que es muy alto → se reporta en **Electricidad (Alcance 2)**
- Combustión en hornos de cocción de ánodos o de colada → se reporta en **Combustiones estacionarias**
- Refinación de bauxita a alúmina, si es de un tercero → se reporta en **Productos comprados**

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa **produce aluminio primario** por electrólisis (proceso Hall-Héroult)?
- ¿Operas celdas de **ánodo precocido (Prebake)** o **Søderberg**?
- ¿Tienes registros de **consumo neto de ánodo** o de **pasta de ánodo** por tonelada de aluminio?
- ¿Registras la **frecuencia y duración de los efectos ánodo**?
- ¿Tienes registros de **toneladas de aluminio producidas** durante el año?

💡 **Tip importante:**
Si produces aluminio primario, **debes declarar emisiones en esta sub-categoría**. Si solo refundes chatarra o extruyes perfiles, tus emisiones son de combustión y electricidad, no de proceso.

---

## ¿Cómo es el cálculo de emisiones?

Las emisiones se calculan sobre la **cantidad de aluminio producido**, multiplicada por un **factor según la tecnología de celda**.

> $CO₂e$ = $Aluminio\ producido \times Factor\ de\ emisión$

💡 **Al final de la página hay un ejemplo ilustrativo**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica la tecnología de celda

| Tecnología                | Cuándo corresponde                                             |
| :------------------------ | :------------------------------------------------------------- |
| Ánodo precocido (Prebake) | Celdas CWPB y SWPB, con ánodos cocidos en horno independiente  |
| Søderberg                 | Celdas VSS y HSS, con pasta de ánodo cocida en la propia celda |

⚠️ Si operas ambas tecnologías, **agrega una línea por cada una** con su producción respectiva.

---

### 2️⃣ Recolecta la producción anual

Debes identificar las **toneladas de aluminio primario producidas durante el año**. Puedes obtenerlas desde:

- Reportes de producción de la fundición
- Balances de masa y de carbono
- Registros de consumo neto de ánodo
- Declaraciones ambientales regulatorias
- ERP o sistemas internos de producción

---

### 3️⃣ Declara aparte las emisiones de PFC

Este es el paso que **no debes omitir**:

1.- Agrega una **segunda línea** en esta misma sub-categoría, con la misma tecnología y producción.

2.- En **"Fuente factor"** selecciona **"Otro"**.

3.- Ingresa tu factor de PFC ya convertido a **kg CO₂e por tonelada de aluminio**.

4.- En el **comentario de la línea**, indica que corresponde a PFC y qué GWP usaste.

💡 Para estimar el factor de PFC necesitas la **frecuencia y duración de los efectos ánodo** de tus celdas, o los coeficientes de pendiente que entrega el proveedor de tecnología. Si tienes monitoreo, usa el dato medido.

---

### 4️⃣ Ingreso de la información

**CASO 1:** Emisiones de CO₂ del ánodo

| Campo               | Qué debes ingresar    |                                      Ejemplo |
| :------------------ | :-------------------- | -------------------------------------------: |
| Tecnología de celda | Tecnología que operas | Ánodo precocido (Prebake), solo CO₂ de ánodo |
| Unidad              | Unidad declarada      |                                    Toneladas |
| Cantidad            | Aluminio anual        |                                    120.000 t |

⚠️ El campo **"Fuente factor" no debes modificarlo**

---

**CASO 2:** Emisiones de PFC, o factores propios de CO₂

1.- Rellena los campos igual que en el Caso 1.

2.- En el campo **"Fuente factor"**, selecciona **"Otro"**.

3.- Modifica el campo **"Factor kgCO₂e/unidad"** con tu valor.

4.- Describe en el comentario qué representa la línea.

---

**CASO 3:** Ya tienes las emisiones totales calculadas externamente

Debes ingresar a la calculadora en **modo experto**. Luego, en el paso 3, debes seleccionar el checkbox **"Sólo quiero ingresar el total de emisiones"**.

💡 Si ya reportas al programa sectorial de la industria del aluminio, este suele ser el camino más consistente.

---

### 📌 Ejemplo práctico

Supongamos que tu fundición produjo **120.000 toneladas de aluminio** en celdas Prebake, con un factor de **1.600 kg CO₂e por tonelada**:

> $CO₂e$ = $120.000\ t \times 1.600\ kg\ CO₂e/t$ = $192.000.000\ kg\ CO₂e$

Es decir, el consumo de ánodo habría generado:

- **192.000 toneladas de CO₂e en el año**

⚠️ A esta cifra **le falta el PFC**. Recuerda agregar la línea correspondiente.

---

## 📝 Notas importantes

> - El factor por defecto es el **valor Tier 1 del IPCC** para consumo de ánodo o de pasta, y cubre **solo CO₂**
> - **Las emisiones de PFC son obligatorias** en un inventario completo y van en una línea aparte con factor propio
> - Si conoces tu **consumo neto de ánodo** por tonelada de aluminio, un factor propio es notablemente más preciso que el valor por defecto
> - No incluyas el consumo eléctrico de las celdas aquí: en aluminio primario suele ser la mayor fuente de la huella, y va en Alcance 2
> - Guarda balances de carbono, registros de consumo de ánodo y de efectos ánodo como respaldo para auditorías o verificaciones externas
