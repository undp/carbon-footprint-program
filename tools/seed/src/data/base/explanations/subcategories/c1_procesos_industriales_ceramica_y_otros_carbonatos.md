# 🏺 Procesos industriales – Cerámica y otros carbonatos

Esta sub-categoría corresponde a **las emisiones por otros usos de carbonatos en procesos productivos**: el CO₂ que se libera cuando **un carbonato se descompone por calor** en un proceso que no es la producción de cemento, cal ni vidrio.

Cubre:

- 🏺 **Cerámica** – descomposición de carbonatos de la pasta durante la cocción
- 🧴 **Otros usos de carbonato de sodio** – detergentes, tratamiento de agua, metalurgia
- ⚪ **Magnesia no metalúrgica** – calcinación de magnesita para refractarios y otros usos

⚠️ No debes incluir aquí:

- Combustión del horno de cocción → se reporta en **Combustiones estacionarias**
- Consumo eléctrico → se reporta en **Electricidad (Alcance 2)**
- Cemento, cal y vidrio, que tienen su **propia sub-categoría**

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa **cuece productos cerámicos** (ladrillos, tejas, sanitarios, revestimientos, porcelanato)?
- ¿Tu pasta o esmalte contiene **carbonato de calcio, dolomita o carbonato de sodio**?
- ¿Usas **carbonato de sodio (soda ash)** como insumo de proceso en volúmenes relevantes?
- ¿Produces **magnesia** por calcinación de magnesita?
- ¿Tienes registros de **consumo anual de carbonatos** o de producción cocida?

💡 **Tip importante:**
Si la respuesta a **una o más de estas preguntas es SÍ**, entonces tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

💡 En cerámica, la emisión de proceso depende del **contenido de carbonatos de la pasta**, que varía mucho entre productos. Si tu pasta es prácticamente libre de carbonatos, la emisión de proceso será muy baja.

---

## ¿Cómo es el cálculo de emisiones?

> $CO₂e$ = $Cantidad\ de\ actividad \times Factor\ de\ emisión$

⚠️ **Esta sub-categoría no trae factores por defecto**, porque el valor depende de la composición de tu materia prima. El IPCC calcula estas emisiones a partir del **contenido real de carbonatos**, no de un valor único por tonelada de producto.

💡 Factores estequiométricos útiles, en toneladas de CO₂ por tonelada de carbonato:

| Carbonato                     | CO₂ liberado |
| :---------------------------- | -----------: |
| Carbonato de calcio (CaCO₃)   |         0,44 |
| Carbonato de magnesio (MgCO₃) |         0,52 |
| Dolomita (CaCO₃·MgCO₃)        |         0,48 |
| Carbonato de sodio (Na₂CO₃)   |         0,41 |

💡 **Al final de la página hay un ejemplo ilustrativo**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica el proceso

| Proceso                                | Qué declarar                                 |
| :------------------------------------- | :------------------------------------------- |
| Cerámica (ladrillos y tejas)           | Carbonatos contenidos en la pasta cocida     |
| Cerámica (sanitarios y revestimientos) | Carbonatos contenidos en pasta y esmalte     |
| Otros usos de carbonato de sodio       | Toneladas de Na₂CO₃ consumidas en el proceso |
| Producción de magnesia no metalúrgica  | Toneladas de magnesita calcinada             |
| Otro                                   | Descríbelo en el comentario de la línea      |

⚠️ Si tienes varias líneas de producto con composiciones distintas, **agrega una línea por cada una**.

---

### 2️⃣ Recolecta la cantidad anual

Lo más práctico es declarar la **cantidad de carbonato consumido**, no la de producto terminado. Puedes obtenerla desde:

- Formulaciones de pasta y esmalte, con su porcentaje de carbonatos
- Órdenes de compra e inventarios de materias primas
- Fichas técnicas de proveedores de arcillas y fundentes
- Reportes de producción y balances de masa

> **Carbonato consumido** = $Producción\ cocida \times \%\ de\ carbonatos\ de\ la\ pasta$

---

### 3️⃣ Determina tu factor de emisión

**Opción 1 – Composición real.** Multiplica cada carbonato de tu formulación por su factor estequiométrico de la tabla anterior. Es el camino que sigue el IPCC y el más defendible.

**Opción 2 – Análisis de laboratorio.** Si tienes ensayos de pérdida por calcinación de tu materia prima, úsalos para derivar el factor.

**Opción 3 – Estimación con supuestos declarados.** Si no tienes la composición, estima con datos del proveedor o del sector y **deja escritos los supuestos** en el comentario.

---

### 4️⃣ Ingreso de la información

**CASO 1:** Declaras la cantidad y **tu propio factor**

| Campo                | Qué debes ingresar     |                      Ejemplo |
| :------------------- | :--------------------- | ---------------------------: |
| Proceso              | Proceso que declaras   | Cerámica (ladrillos y tejas) |
| Unidad               | Unidad declarada       |                    Toneladas |
| Cantidad             | Carbonatos consumidos  |                      3.000 t |
| Fuente factor        | Selecciona **"Otro"**  |                         Otro |
| Factor kgCO₂e/unidad | Tu factor              |                          440 |
| Comentario           | Composición y supuesto |         CaCO₃ 8% de la pasta |

---

**CASO 2:** Ya tienes las emisiones totales calculadas externamente

Debes ingresar a la calculadora en **modo experto**. Luego, en el paso 3, debes seleccionar el checkbox **"Sólo quiero ingresar el total de emisiones"**.

---

### 📌 Ejemplo práctico

Supongamos que tu planta cerámica produjo **37.500 toneladas** de producto cocido, con una pasta que contiene **8% de carbonato de calcio**:

> **Carbonato consumido** = $37.500\ t \times 0,08$ = $3.000\ t$

Con el factor estequiométrico del CaCO₃, **440 kg CO₂e por tonelada**:

> $CO₂e$ = $3.000\ t \times 440\ kg\ CO₂e/t$ = $1.320.000\ kg\ CO₂e$

Es decir, el proceso habría generado:

- **1.320 toneladas de CO₂e en el año**

⚠️ Es importante que las **unidades coincidan**, y que la cantidad declarada sea de **carbonato**, no de producto terminado, si usas el factor estequiométrico.

---

## 📝 Notas importantes

> - Esta sub-categoría **no trae factores por defecto**: siempre debes usar **"Otro"** como **"Fuente factor"**
> - **Declara la cantidad y el factor de forma coherente**: o carbonato consumido con factor estequiométrico, o producto cocido con un factor por tonelada de producto. Mezclarlos es el error más común
> - Si tu pasta es prácticamente **libre de carbonatos**, la emisión será muy baja: decláralo igual para que el inventario quede completo
> - No incluyas la combustión del horno aquí: en cerámica suele ser la fuente dominante, y va en Combustiones estacionarias
> - Guarda formulaciones, fichas técnicas y ensayos de laboratorio como respaldo para auditorías o verificaciones externas
