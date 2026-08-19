# 🏭 Procesos industriales – Metales

Esta sub-categoría corresponde a **las emisiones de proceso de la industria metalúrgica**: el CO₂ que se libera cuando **el carbono actúa como agente reductor** para extraer el metal desde su mineral, y los gases de proceso propios de la electrólisis.

Cubre seis procesos:

- ⛓️ **Hierro y acero** – reducción del mineral de hierro, coquería, sinterizado y conversión a acero
- 🔗 **Ferroaleaciones** – ferrosilicio, ferromanganeso, silicomanganeso, ferrocromo, silicio metálico
- 🥫 **Aluminio** – oxidación del ánodo de carbono en la electrólisis
- 🪫 **Magnesio** – gases de cobertura de las celdas
- 🔋 **Plomo** – reducción del óxido de plomo en la fundición
- ⚙️ **Cinc** – volatilización y reducción en Waelz Kiln o horno pirometalúrgico

Aquí se reportan las emisiones que **provienen de la reacción química y del consumo de reductores**, no del consumo energético.

⚠️ No debes incluir aquí:

- Combustión de combustibles en hornos → se reporta en **Combustiones estacionarias**
- Consumo eléctrico, que en metalurgia suele ser muy alto → se reporta en **Electricidad (Alcance 2)**
- Transporte de mineral, chatarra o producto → se reporta en la categoría correspondiente

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa **produce acero** a partir de mineral de hierro o de chatarra?
- ¿Operas un **alto horno, un convertidor BOF o un horno de arco eléctrico**?
- ¿Tienes **coquería, planta de sinterizado o de peletización**?
- ¿Produces **ferroaleaciones** en horno de arco sumergido?
- ¿Operas **celdas de electrólisis de aluminio** (Prebake o Søderberg)?
- ¿Fundes o refinas **cinc, plomo o magnesio**?
- ¿Tu proceso consume **coque, carbón, electrodos o ánodos de carbono** como reductor?

💡 **Tip importante:**
Si tu empresa **transforma mineral o chatarra en metal mediante procesos metalúrgicos**, o si la respuesta a **una o más de estas preguntas es SÍ**, entonces probablemente **debe medir y declarar emisiones en esta sub-categoría**.

---

## ¿Cómo es el cálculo de emisiones?

Las emisiones se calculan sobre la **cantidad de metal producido**, multiplicada por un **factor de emisión específico según el método de fabricación**.

> $CO₂e$ = $Metal\ producido \times Factor\ de\ emisión$

💡 El método importa mucho: en acero, la ruta de horno de arco eléctrico tiene un factor **más de quince veces menor** que la ruta de alto horno más convertidor.

💡 **Al final de la página hay un ejemplo ilustrativo**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica el proceso y el método

Primero eliges el **Proceso** y después el **Material o método**:

| Proceso         | Material o método a elegir                                                                        |
| :-------------- | :------------------------------------------------------------------------------------------------ |
| Hierro y acero  | BOF · EAF · OHF · Promedio global · Sinterizado · Coquería · Arrabio · DRI · Peletización         |
| Ferroaleaciones | Ferrosilicio (45/65/75/90% Si) · Ferromanganeso · Silicomanganeso · Silicio metálico · Ferrocromo |
| Aluminio        | Ánodo precocido (Prebake) · Søderberg                                                             |
| Plomo           | Horno Imperial Smelting · Fundición directa · Materias primas secundarias · Promedio              |
| Cinc            | Waelz Kiln · Pirometalúrgico · Promedio por defecto                                               |
| Magnesio        | Sin método predefinido: debes declarar tu propio factor                                           |

⚠️ Si tu planta tiene **varias etapas** (por ejemplo coquería, sinterizado y BOF), declara **una línea por etapa** para no perder trazabilidad.

⚠️ Si no conoces la ruta exacta, usa el **Promedio global** o el **Promedio por defecto** y déjalo documentado.

---

### 2️⃣ Recolecta la producción anual

Debes identificar la **cantidad total de metal producido durante el año**, en toneladas.

Puedes obtener esta información desde:

- Reportes de producción de planta
- Balances metalúrgicos y de masa
- Informes operacionales y de despacho
- Declaraciones ambientales regulatorias
- Registros de consumo de reductores (coque, carbón, ánodos)
- ERP o sistemas internos de producción

⚠️ Declara **acero crudo producido**, no producto terminado ni capacidad instalada.

---

### 3️⃣ Si no tienes el total anual consolidado

#### **Opción 1:** Sumar la producción mensual

> **Producción anual** = Suma de la producción de los 12 meses

---

#### **Opción 2:** Estimar desde el consumo de reductor

Si llevas registro del consumo de coque o de ánodos pero no de la producción, puedes estimar la producción con el rendimiento típico de tu proceso y **declarar el supuesto utilizado**.

⚠️ Esta aproximación es menos precisa. Si el proceso es material para tu huella, prioriza el dato de producción.

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir la cantidad anual**

| Campo             | Qué debes ingresar               |                       Ejemplo |
| :---------------- | :------------------------------- | ----------------------------: |
| Proceso           | Proceso metalúrgico que realizas |                Hierro y acero |
| Material o método | Ruta de fabricación              | Horno básico de oxígeno (BOF) |
| Unidad            | Unidad declarada                 |                     Toneladas |
| Cantidad          | Total anual producido            |                     250.000 t |

⚠️ El campo **"Fuente factor" no debes modificarlo**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Debes rellenar los campos igual que en el Caso 1.

2.- Luego, en el campo **"Fuente factor"**, debes seleccionar **"Factor propio"**.

3.- Debes modificar el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado.

💡 Este es el camino que debes usar para **Magnesio** y para procesos metalúrgicos sin factor por defecto.

---

**CASO 3:** Ya tienes las emisiones totales calculadas externamente

Debes ingresar a la calculadora en **modo experto**. Luego, en el paso 3, debes seleccionar el checkbox **"Sólo quiero ingresar el total de emisiones"**, lo que habilitará el recuadro para ingresar las **emisiones totales del proceso**.

---

### 📌 Ejemplo práctico

Supongamos que durante el año tu empresa produjo **250.000 toneladas de acero** en un convertidor BOF, y el factor de emisión es **1.460 kg CO₂e por tonelada**:

> $CO₂e$ = $250.000\ t \times 1.460\ kg\ CO₂e/t$ = $365.000.000\ kg\ CO₂e$

Es decir, el proceso habría generado:

- **365.000 toneladas de CO₂e en el año**

⚠️ Es importante que las **unidades coincidan**. Si el factor está expresado por tonelada, la cantidad debe estar en toneladas.

---

## 📝 Notas importantes

> - Esta sub-categoría aplica solo a empresas que **reducen o funden metales**, no a quienes solo los transforman mecánicamente
> - Los factores por defecto corresponden a los **valores Tier 1 del IPCC**; si tienes balances de carbono de planta, un factor propio es siempre más preciso
> - **Aluminio:** el factor por defecto cubre **solo el CO₂ del consumo de ánodo**. Las emisiones de **PFC** (CF₄ y C₂F₆) asociadas al efecto ánodo **no están incluidas** y, por su altísimo potencial de calentamiento, debes declararlas en una línea aparte con factor propio
> - **Acero por horno de arco eléctrico:** el factor no incluye las emisiones de la producción de hierro, porque parte de chatarra
> - No incluyas combustibles ni electricidad aquí
> - Guarda balances metalúrgicos y registros de consumo de reductores como respaldo para auditorías o verificaciones externas
