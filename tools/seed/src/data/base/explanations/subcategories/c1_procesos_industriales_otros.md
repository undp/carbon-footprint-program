# 🏭 Procesos industriales – Otros

Esta sub-categoría es **residual dentro de los procesos industriales**: recoge las emisiones de proceso que **no encajan en las ramas mineral, química ni metalúrgica**.

Cubre principalmente:

- 📄 **Papel y celulosa** – calcinación de carbonato de calcio en el horno de cal de la planta
- 🍞 **Alimentos y bebidas** – CO₂ de fermentación y de procesos de transformación
- 💻 **Electrónica y semiconductores** – gases fluorados y N₂O usados en la fabricación de obleas y pantallas
- 🛢️ **Uso de lubricantes** – carbono del lubricante que se oxida en uso
- 🕯️ **Uso de ceras de parafina** – carbono de la cera que se oxida en uso
- 🧴 **Uso de solventes** – carbono del solvente que se libera a la atmósfera

Aquí se reportan las emisiones que **provienen del proceso o del uso no energético de un producto**, no del consumo energético.

⚠️ **Las otras sub-categorías tienen prioridad.** Antes de usar esta, verifica que tu proceso no sea:

- Mineral (cemento, cal, vidrio, cerámica) → **Procesos industriales – Minerales**
- Químico (amoníaco, ácido nítrico, petroquímicos) → **Procesos industriales – Química**
- Metalúrgico (acero, aluminio, cinc, plomo) → **Procesos industriales – Metales**
- Una fuente que no es de proceso (ganadería, RILes, extintores) → **Emisiones provenientes de otras fuentes**

⚠️ Tampoco incluyas aquí:

- Combustión de combustibles → se reporta en **Combustiones estacionarias**
- Consumo eléctrico → se reporta en **Electricidad (Alcance 2)**
- Fugas de refrigerantes → se reporta en **Emisiones fugitivas**

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu planta de **celulosa o papel** opera un horno de cal propio?
- ¿Tienes procesos de **fermentación** en cervecería, destilería, panificación o lácteos?
- ¿Fabricas **semiconductores, pantallas o paneles fotovoltaicos** usando gases de proceso?
- ¿Consumes **lubricantes, grasas o ceras** en volúmenes significativos?
- ¿Usas **solventes** que se evaporan durante el proceso?
- ¿Tienes alguna emisión de proceso bajo tu control que **no encaje** en las otras tres ramas?

💡 **Tip importante:**
Si la respuesta a **una o más de estas preguntas es SÍ**, tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

---

## ¿Cómo es el cálculo de emisiones?

El cálculo sigue la lógica general:

> $CO₂e$ = $Cantidad\ de\ actividad \times Factor\ de\ emisión$

Lo que cambia es **qué se mide** según el tipo de proceso:

| Tipo de proceso     | Cantidad de actividad          |
| :------------------ | :----------------------------- |
| Papel y celulosa    | t de carbonato calcinado       |
| Alimentos y bebidas | t o hL de producto fermentado  |
| Electrónica         | kg de gas de proceso consumido |
| Lubricantes y ceras | t de producto consumido        |
| Solventes           | t de solvente consumido        |

⚠️ **Esta sub-categoría no trae factores por defecto**: la variedad de procesos que cubre hace imposible un valor único. Siempre debes declarar tu propio factor.

💡 **Al final de la página hay un ejemplo ilustrativo**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica el proceso y descríbelo

Elige el **Proceso** que corresponda. Si ninguno aplica, elige **"Otro"**.

⚠️ Cuando uses **"Otro"**, es **obligatorio** describir de qué proceso se trata en el **comentario de la línea**. Sin esa descripción, la emisión no es verificable y un revisor externo la objetará.

💡 Escribe el comentario pensando en alguien que no conoce tu planta: qué proceso es, qué gas emite y de dónde sale el dato.

---

### 2️⃣ Recolecta la cantidad anual

Debes identificar la **cantidad total del año**. Las fuentes varían según el proceso:

- **Papel y celulosa:** balances del horno de cal, registros de consumo de caliza
- **Alimentos y bebidas:** volúmenes de producción, balances de fermentación
- **Electrónica:** registros de compra y consumo de gases de proceso
- **Lubricantes, ceras y solventes:** órdenes de compra, inventarios de bodega, registros de consumo

⚠️ Para lubricantes y solventes, el consumo neto es **compras menos variación de inventario**, no solo las compras del año.

---

### 3️⃣ Determina tu factor de emisión

#### **Opción 1:** Medición o balance de carbono

Si conoces el contenido de carbono del insumo y la fracción que se oxida, calcula el factor directamente. Es el camino más defendible.

---

#### **Opción 2:** Factor del IPCC para tu proceso

El IPCC publica factores Tier 1 para papel y celulosa, alimentos, electrónica y uso no energético de productos. Tómalo, conviértelo a kg CO₂e si está expresado por gas, y **documenta el GWP** que usaste.

---

#### **Opción 3:** Estimación con supuestos declarados

Si no tienes ninguna de las anteriores, estima con datos sectoriales y **deja escritos los supuestos** en el comentario de la línea.

---

### 4️⃣ Ingreso de la información

**CASO 1:** Declaras la cantidad y **tu propio factor** (el camino habitual en esta sub-categoría)

| Campo                | Qué debes ingresar                     |                    Ejemplo |
| :------------------- | :------------------------------------- | -------------------------: |
| Proceso              | Proceso que realizas                   |           Papel y celulosa |
| Unidad               | Unidad declarada                       |                  Toneladas |
| Cantidad             | Total anual                            |                   15.000 t |
| Fuente factor        | Selecciona **"Factor propio"**         |              Factor propio |
| Factor kgCO₂e/unidad | Tu factor                              |                        440 |
| Comentario           | Descripción del proceso y del supuesto | Horno de cal, caliza CaCO₃ |

---

**CASO 2:** Ya tienes las emisiones totales calculadas externamente

Debes ingresar a la calculadora en **modo experto**. Luego, en el paso 3, debes seleccionar el checkbox **"Sólo quiero ingresar el total de emisiones"**, lo que habilitará el recuadro para ingresar las **emisiones totales del proceso**.

---

### 📌 Ejemplo práctico

Supongamos que tu planta de celulosa calcinó **15.000 toneladas de carbonato de calcio** en su horno de cal durante el año.

Por estequiometría, la descomposición del CaCO₃ libera **0,44 toneladas de CO₂ por tonelada de carbonato**, es decir **440 kg CO₂e por tonelada**:

> $CO₂e$ = $15.000\ t \times 440\ kg\ CO₂e/t$ = $6.600.000\ kg\ CO₂e$

Es decir, el proceso habría generado:

- **6.600 toneladas de CO₂e en el año**

⚠️ Es importante que las **unidades coincidan**. Si el factor está expresado por tonelada, la cantidad debe estar en toneladas.

---

## 📝 Notas importantes

> - Esta sub-categoría es **residual**: las ramas mineral, química y metalúrgica **tienen prioridad**. Úsala solo cuando no haya mejor encaje
> - Si eliges **"Otro"**, **describe el proceso en el comentario**. Es la única forma de que la línea sea auditable
> - **No trae factores por defecto**: siempre debes usar **"Factor propio"** y documentar de dónde viene
> - Si el proceso emite **N₂O o gases fluorados**, anota el GWP que usaste para convertir a CO₂e
> - **Documenta tus supuestos.** Las fuentes residuales requieren más estimaciones que las estándar
> - Si la fuente es **muy material** para tu huella, evalúa medición en planta o apoyo de un especialista en GEI
> - Guarda registros de actividad, balances y órdenes de compra como respaldo para auditorías o verificaciones externas
