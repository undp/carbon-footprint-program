# 🔗 Procesos industriales – Ferroaleaciones y otros metales

Esta sub-categoría corresponde a **las emisiones de proceso de la producción de ferroaleaciones, plomo y magnesio**: el CO₂ que se libera cuando **el carbono actúa como agente reductor** para extraer el metal desde su mineral.

Cubre:

- 🔗 **Ferroaleaciones** – ferrosilicio, ferromanganeso, silicomanganeso, ferrocromo y silicio metálico
- 🔋 **Plomo** – reducción del óxido de plomo, primario y secundario
- 🪫 **Magnesio** – gases de cobertura de las celdas, principalmente SF₆

Aquí se reportan las emisiones que **provienen de la reacción química y del consumo de reductores**, no del consumo energético.

⚠️ No debes incluir aquí:

- Combustión en hornos → se reporta en **Combustiones estacionarias**
- Consumo eléctrico del horno de arco, que suele ser muy alto → se reporta en **Electricidad (Alcance 2)**
- Acero, aluminio y cinc, que tienen su **propia sub-categoría**

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa **produce ferroaleaciones** en horno de arco sumergido?
- ¿Produces **silicio metálico**?
- ¿Fundes o refinas **plomo**, primario o desde chatarra de baterías?
- ¿Produces o funde **magnesio** usando gases de cobertura?
- ¿Tu proceso consume **coque, carbón, electrodos o carbón vegetal** como reductor?
- ¿Tienes registros de **toneladas de producto** y de **consumo de reductor** del año?

💡 **Tip importante:**
Si la respuesta a **una o más de estas preguntas es SÍ**, entonces tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

---

## ¿Cómo es el cálculo de emisiones?

Las emisiones se calculan sobre la **cantidad de producto fabricado**, multiplicada por un **factor de emisión específico según el producto y la ruta**.

> $CO₂e$ = $Producto\ fabricado \times Factor\ de\ emisión$

💡 En ferroaleaciones el factor depende fuertemente del **contenido de silicio**: va desde 2.500 kg CO₂e por tonelada en ferrosilicio 45% hasta 5.000 en silicio metálico.

💡 **Al final de la página hay un ejemplo ilustrativo**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica el producto o proceso

| Grupo           | Opciones disponibles                                                                                          |
| :-------------- | :------------------------------------------------------------------------------------------------------------ |
| Ferroaleaciones | Ferrosilicio 45/65/75/90% Si · Ferromanganeso (7% C y 1% C) · Silicomanganeso · Silicio metálico · Ferrocromo |
| Plomo           | Horno Imperial Smelting (ISF) · Fundición directa (DS) · Materias primas secundarias · Promedio por defecto   |
| Magnesio        | Sin factor por defecto: debes declarar tu propio factor                                                       |

⚠️ Si produces varias aleaciones, **agrega una línea por cada una**: los factores son muy distintos entre sí.

⚠️ Si no conoces la ruta de plomo, usa el **Promedio por defecto** y déjalo documentado.

---

### 2️⃣ Recolecta la producción anual

Debes identificar las **toneladas de producto fabricadas durante el año**. Puedes obtenerlas desde:

- Reportes de producción de planta
- Balances metalúrgicos y de masa
- Registros de consumo de reductores (coque, carbón, electrodos)
- Declaraciones ambientales regulatorias
- ERP o sistemas internos de producción

---

### 3️⃣ Si no tienes el total anual consolidado

Suma la producción mensual de los 12 meses. Si llevas registro del consumo de reductor pero no de la producción, estima con el rendimiento típico de tu proceso y **declara el supuesto utilizado**.

⚠️ Si el proceso es material para tu huella, prioriza el dato de producción medido.

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir la cantidad anual**

| Campo              | Qué debes ingresar    |             Ejemplo |
| :----------------- | :-------------------- | ------------------: |
| Producto o proceso | Producto fabricado    | Ferrosilicio 75% Si |
| Unidad             | Unidad declarada      |           Toneladas |
| Cantidad           | Total anual producido |            18.000 t |

⚠️ El campo **"Fuente factor" no debes modificarlo**

---

**CASO 2:** Eres **experto y utilizas factores propios**

1.- Debes rellenar los campos igual que en el Caso 1.

2.- Luego, en el campo **"Fuente factor"**, debes seleccionar **"Factor propio"**.

3.- Debes modificar el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado.

💡 Este es el camino obligatorio para **Magnesio**: su emisión dominante es SF₆, y convertirla a CO₂e exige elegir un GWP. Documenta cuál usaste.

---

**CASO 3:** Ya tienes las emisiones totales calculadas externamente

Debes ingresar a la calculadora en **modo experto**. Luego, en el paso 3, debes seleccionar el checkbox **"Sólo quiero ingresar el total de emisiones"**.

---

### 📌 Ejemplo práctico

Supongamos que durante el año tu empresa produjo **18.000 toneladas de ferrosilicio 75% Si**, con un factor de **4.000 kg CO₂e por tonelada**:

> $CO₂e$ = $18.000\ t \times 4.000\ kg\ CO₂e/t$ = $72.000.000\ kg\ CO₂e$

Es decir, el proceso habría generado:

- **72.000 toneladas de CO₂e en el año**

⚠️ Es importante que las **unidades coincidan**.

---

## 📝 Notas importantes

> - Los factores por defecto corresponden a los **valores Tier 1 del IPCC** y suponen el uso de reductores fósiles
> - ⚠️ **Si usas biocarbono** (carbón vegetal) como reductor, los factores por defecto **no aplican**: debes calcular tu propio factor descontando el carbono de origen biogénico
> - **Magnesio** emite principalmente SF₆: declara tu propio factor y el GWP utilizado
> - Si conoces el **consumo de carbono fijo** por tonelada de producto, un factor propio es notablemente más preciso
> - No incluyas combustibles ni electricidad aquí
> - Guarda balances metalúrgicos y registros de consumo de reductores como respaldo para auditorías o verificaciones externas
