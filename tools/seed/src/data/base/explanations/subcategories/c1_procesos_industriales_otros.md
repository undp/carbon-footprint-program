# 🏭 Procesos industriales – Otros

Esta sub-categoría es **residual dentro de los procesos industriales**: recoge las emisiones de proceso que **no encajan en ninguna de las otras sub-categorías de procesos industriales**.

Cubre principalmente:

- 🍞 **Alimentos y bebidas** – CO₂ de fermentación y de procesos de transformación
- 💻 **Electrónica y semiconductores** – gases fluorados y N₂O usados en la fabricación de obleas y pantallas
- 🛢️ **Uso de lubricantes** – carbono del lubricante que se oxida en uso
- 🕯️ **Uso de ceras de parafina** – carbono de la cera que se oxida en uso
- 🧴 **Uso de solventes** – carbono del solvente que se libera a la atmósfera

⚠️ **Las otras sub-categorías tienen prioridad.** Antes de usar esta, verifica que tu proceso no sea:

- Cemento, Cal, Vidrio, o Cerámica y otros carbonatos
- Química
- Acero, Aluminio, Cinc, o Ferroaleaciones y otros metales
- Papel y celulosa
- Una fuente que no es de proceso (ganadería, RILes, extintores) → **Emisiones provenientes de otras fuentes**

⚠️ Tampoco incluyas aquí:

- Combustión de combustibles → se reporta en **Combustiones estacionarias**
- Consumo eléctrico → se reporta en **Electricidad (Alcance 2)**
- Fugas de refrigerantes → se reporta en **Emisiones fugitivas**

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tienes procesos de **fermentación** en cervecería, destilería, panificación o lácteos?
- ¿Fabricas **semiconductores, pantallas o paneles fotovoltaicos** usando gases de proceso?
- ¿Consumes **lubricantes, grasas o ceras** en volúmenes significativos?
- ¿Usas **solventes** que se evaporan durante el proceso?
- ¿Tienes alguna emisión de proceso bajo tu control que **no encaje** en las otras sub-categorías?

💡 **Tip importante:**
Si la respuesta a **una o más de estas preguntas es SÍ**, tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

---

## ¿Cómo es el cálculo de emisiones?

> $CO₂e$ = $Cantidad\ de\ actividad \times Factor\ de\ emisión$

Lo que cambia es **qué se mide** según el tipo de proceso:

| Tipo de proceso     | Cantidad de actividad          |
| :------------------ | :----------------------------- |
| Alimentos y bebidas | t o hL de producto fermentado  |
| Electrónica         | kg de gas de proceso consumido |
| Lubricantes y ceras | t de producto consumido        |
| Solventes           | t de solvente consumido        |

⚠️ **Esta sub-categoría no trae factores por defecto**: la variedad de procesos que cubre hace imposible un valor único. Siempre debes declarar tu propio factor.

💡 **Al final de la página hay un ejemplo ilustrativo**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica el proceso y descríbelo

Elige el **Proceso** que corresponda. Si ninguno aplica, elige **"Otro proceso industrial"**.

⚠️ Cuando uses **"Otro proceso industrial"**, es **obligatorio** describir de qué proceso se trata en el **comentario de la línea**. Sin esa descripción, la emisión no es verificable y un revisor externo la objetará.

💡 Escribe el comentario pensando en alguien que no conoce tu planta: qué proceso es, qué gas emite y de dónde sale el dato.

---

### 2️⃣ Recolecta la cantidad anual

Las fuentes varían según el proceso:

- **Alimentos y bebidas:** volúmenes de producción, balances de fermentación
- **Electrónica:** registros de compra y consumo de gases de proceso
- **Lubricantes, ceras y solventes:** órdenes de compra, inventarios de bodega, registros de consumo

⚠️ Para lubricantes y solventes, el consumo neto es **compras menos variación de inventario**, no solo las compras del año.

---

### 3️⃣ Determina tu factor de emisión

**Opción 1 – Balance de carbono.** Si conoces el contenido de carbono del insumo y la fracción que se oxida, calcula el factor directamente. Es el camino más defendible.

**Opción 2 – Factor del IPCC para tu proceso.** El IPCC publica factores Tier 1 para alimentos, electrónica y uso no energético de productos. Tómalo, conviértelo a kg CO₂e si está expresado por gas, y **documenta el GWP** que usaste.

**Opción 3 – Estimación con supuestos declarados.** Si no tienes ninguna de las anteriores, estima con datos sectoriales y **deja escritos los supuestos** en el comentario de la línea.

---

### 4️⃣ Ingreso de la información

**CASO 1:** Declaras la cantidad y **tu propio factor**

| Campo                | Qué debes ingresar             |                 Ejemplo |
| :------------------- | :----------------------------- | ----------------------: |
| Proceso              | Proceso que realizas           |      Uso de lubricantes |
| Unidad               | Unidad declarada               |               Toneladas |
| Cantidad             | Total anual consumido          |                    40 t |
| Fuente factor        | Selecciona **"Factor propio"** |           Factor propio |
| Factor kgCO₂e/unidad | Tu factor                      |                   2.200 |
| Comentario           | Supuesto utilizado             | 20% del carbono oxidado |

---

**CASO 2:** Ya tienes las emisiones totales calculadas externamente

Debes ingresar a la calculadora en **modo experto**. Luego, en el paso 3, debes seleccionar el checkbox **"Sólo quiero ingresar el total de emisiones"**.

---

### 📌 Ejemplo práctico

Supongamos que tu planta consumió **40 toneladas de lubricantes** durante el año, y estimas que el **20% de su carbono se oxida** en uso.

Con un contenido de carbono típico de 0,8 t C por tonelada de lubricante y la relación CO₂/C de 3,67:

> **Factor** = $0,8 \times 0,20 \times 3,67 \times 1.000$ ≈ $587\ kg\ CO₂e/t$

> $CO₂e$ = $40\ t \times 587\ kg\ CO₂e/t$ = $23.480\ kg\ CO₂e$

Es decir, el uso de lubricantes habría generado:

- **23,5 toneladas de CO₂e en el año**

⚠️ Los valores de este ejemplo son **referenciales**. Usa los que correspondan a tu insumo y déjalos documentados.

---

## 📝 Notas importantes

> - Esta sub-categoría es **residual**: las demás sub-categorías de procesos industriales **tienen prioridad**. Úsala solo cuando no haya mejor encaje
> - Si eliges **"Otro proceso industrial"**, **describe el proceso en el comentario**. Es la única forma de que la línea sea auditable
> - **No trae factores por defecto**: siempre debes usar **"Factor propio"** y documentar de dónde viene
> - Si el proceso emite **N₂O o gases fluorados**, anota el GWP que usaste para convertir a CO₂e
> - **Documenta tus supuestos.** Las fuentes residuales requieren más estimaciones que las estándar
> - Si la fuente es **muy material** para tu huella, evalúa medición en planta o apoyo de un especialista en GEI
> - Guarda registros de actividad, balances y órdenes de compra como respaldo para auditorías o verificaciones externas
