# 🧪 Procesos industriales – Química

Esta sub-categoría corresponde a **las emisiones de proceso de la industria química**: los gases que se generan como **producto o subproducto de la reacción**, no por quemar combustible.

Cubre los procesos donde el carbono o el nitrógeno del insumo termina en la atmósfera: amoníaco, ácido nítrico, ácido adípico, caprolactama, carburos, dióxido de titanio, carbonato de sodio, petroquímicos, negro de humo y fluoroquímicos.

⚠️ No debes incluir aquí:

- Combustión en calderas, hornos o antorchas → se reporta en **Combustiones estacionarias**
- Consumo eléctrico → se reporta en **Electricidad (Alcance 2)**
- Fugas de refrigerantes de equipos de frío → se reporta en **Emisiones fugitivas**

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa **sintetiza amoníaco, urea o fertilizantes nitrogenados**?
- ¿Produces **ácido nítrico, ácido adípico o caprolactama**?
- ¿Operas plantas de **etileno, metanol, óxido de etileno, acrilonitrilo o negro de humo**?
- ¿Fabricas **carburo de calcio o de silicio**?
- ¿Produces **dióxido de titanio** o **carbonato de sodio**?
- ¿Fabricas o purificas **gases fluorados** (HFC, PFC, SF₆)?
- ¿Usas hidrocarburos **como materia prima** y no como combustible?

💡 **Tip importante:**
Si la respuesta a **una o más de estas preguntas es SÍ**, entonces tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

💡 La pregunta que mejor discrimina es la última: si el hidrocarburo entra **como insumo de la reacción**, sus emisiones son de proceso y van aquí.

---

## ¿Cómo es el cálculo de emisiones?

> $CO₂e$ = $Producción \times Factor\ de\ emisión$

⚠️ **Esta sub-categoría no trae factores por defecto, y es a propósito.** Los factores del IPCC para estos procesos están expresados **por gas**, no en CO₂ equivalente:

| Proceso        | Gas dominante | Unidad del factor IPCC |
| :------------- | :------------ | :--------------------- |
| Amoníaco       | CO₂           | t CO₂ / t NH₃          |
| Ácido nítrico  | **N₂O**       | kg N₂O / t HNO₃        |
| Ácido adípico  | **N₂O**       | kg N₂O / t producto    |
| Carburo        | CO₂           | t CO₂ / t producto     |
| Fluoroquímicos | **HFC / PFC** | kg gas / t producto    |

Convertir un factor de N₂O o de gases fluorados a CO₂e exige **elegir un potencial de calentamiento global (GWP)**, y esa elección forma parte de la metodología de tu inventario. Por eso debes **declarar tu propio factor**, ya convertido a kg CO₂e, y documentar qué GWP usaste.

💡 **Al final de la página hay un ejemplo ilustrativo**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica el proceso

Elige el **Proceso** que realizas. Si produces varios químicos, **agrega una línea por cada uno**: los factores no son comparables entre sí.

Si tu proceso no aparece en la lista, elige **"Otro"** y descríbelo en el **comentario de la línea**.

---

### 2️⃣ Recolecta la producción anual

Debes identificar la **cantidad total producida durante el año**, en toneladas. Puedes obtenerla desde:

- Reportes de producción de planta
- Balances de masa y de nitrógeno
- Informes operacionales
- Declaraciones ambientales regulatorias
- Registros de consumo de materias primas y de gas de síntesis
- ERP o sistemas internos de producción

---

### 3️⃣ Determina tu factor de emisión

**Opción 1 – Medición en planta.** Si tienes monitoreo continuo de la corriente de gases de proceso, usa el dato medido. Es el camino más preciso y el que mejor resiste una verificación externa.

**Opción 2 – Factor IPCC convertido a CO₂e.** Toma el factor Tier 1 del IPCC para tu proceso y multiplícalo por el GWP a 100 años del gas correspondiente:

> **Factor CO₂e** = $Factor\ del\ gas \times GWP_{100}$

⚠️ Anota qué informe del IPCC usaste para el GWP: el valor cambia entre informes de evaluación.

**Opción 3 – Factor del proveedor de tecnología.** Si tu planta tiene catalizador de destrucción de N₂O o sistema de abatimiento, el proveedor suele entregar la eficiencia de reducción. Aplícala sobre el factor sin abatimiento y **declara el supuesto**.

---

### 4️⃣ Ingreso de la información

**CASO 1:** Declaras la cantidad y **tu propio factor** (el camino habitual en esta sub-categoría)

| Campo                | Qué debes ingresar           |       Ejemplo |
| :------------------- | :--------------------------- | ------------: |
| Proceso              | Proceso químico que realizas | Ácido nítrico |
| Unidad               | Unidad declarada             |     Toneladas |
| Cantidad             | Total anual producido        |      40.000 t |
| Fuente factor        | Selecciona **"Otro"**        |          Otro |
| Factor kgCO₂e/unidad | Tu factor convertido a CO₂e  |         2.120 |

---

**CASO 2:** Ya tienes las emisiones totales calculadas externamente

Debes ingresar a la calculadora en **modo experto**. Luego, en el paso 3, debes seleccionar el checkbox **"Sólo quiero ingresar el total de emisiones"**.

💡 Si tu equipo ya reporta a un registro regulatorio, este suele ser el camino más rápido y consistente.

---

### 📌 Ejemplo práctico

Supongamos que tu planta produjo **40.000 toneladas de ácido nítrico**, sin sistema de abatimiento.

El factor Tier 1 del IPCC para una planta de presión media es del orden de **8 kg N₂O por tonelada de HNO₃**. Con un GWP a 100 años de **265** para el N₂O:

> **Factor CO₂e** = $8\ kg\ N₂O/t \times 265$ = $2.120\ kg\ CO₂e/t$

> $CO₂e$ = $40.000\ t \times 2.120\ kg\ CO₂e/t$ = $84.800.000\ kg\ CO₂e$

Es decir, el proceso habría generado:

- **84.800 toneladas de CO₂e en el año**

⚠️ Los valores de este ejemplo son **referenciales**. Usa el factor y el GWP que correspondan a tu planta y a tu metodología, y déjalos documentados.

---

## 📝 Notas importantes

> - Esta sub-categoría **no trae factores por defecto**: siempre debes usar **"Otro"** como **"Fuente factor"**
> - **Documenta el GWP** que usaste para convertir N₂O o gases fluorados a CO₂e. Sin ese dato, el cálculo no es reproducible ni verificable
> - Las emisiones de **N₂O y de gases fluorados** son pequeñas en masa pero enormes en CO₂e: revisa dos veces las unidades antes de declarar
> - Si tu planta tiene **catalizador de abatimiento**, declara la eficiencia aplicada y su respaldo
> - No incluyas combustibles ni electricidad aquí
> - Guarda balances de masa, informes de monitoreo y fichas técnicas del proveedor como respaldo para auditorías o verificaciones externas
