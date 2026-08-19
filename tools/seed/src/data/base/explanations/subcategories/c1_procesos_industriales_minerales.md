# 🏭 Procesos industriales – Minerales

Esta sub-categoría corresponde a **las emisiones de proceso de la industria mineral**: el CO₂ que se libera cuando **los carbonatos se descomponen por acción del calor**, sin importar qué combustible se use para calentarlos.

Cubre cuatro procesos:

- 🧱 **Cemento** – descarbonatación de la caliza para producir clinker
- 🪨 **Cal** – calcinación de caliza o dolomita para producir cal viva
- 🫙 **Vidrio** – descomposición de los carbonatos de la mezcla vitrificable
- 🏺 **Cerámica** – calcinación de arcillas y carbonatos en la cocción

Aquí se reportan las emisiones que **provienen de la reacción química**, no del consumo energético.

⚠️ No debes incluir aquí:

- Combustión de combustibles en el horno → se reporta en **Combustiones estacionarias**
- Consumo eléctrico → se reporta en **Electricidad (Alcance 2)**
- Transporte de materias primas o de producto → se reporta en la categoría correspondiente

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa **fabrica clinker** o compra clinker para producir cemento?
- ¿Produces **cal viva, cal hidratada o cal dolomítica**?
- ¿Fabricas **vidrio nuevo a partir de materias primas** (arena, caliza, carbonato de sodio)?
- ¿Cueces **productos cerámicos** (ladrillos, tejas, sanitarios, revestimientos)?
- ¿Tu proceso incluye la **descarbonatación de carbonato de calcio (CaCO₃)** o de dolomita?
- ¿Usas **caliza, dolomita o carbonato de sodio** como insumo de proceso en otra actividad?

💡 **Tip importante:**
Si la respuesta a **una o más de estas preguntas es SÍ**, entonces tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

---

## ¿Cómo es el cálculo de emisiones?

Las emisiones se calculan sobre la **cantidad de producto fabricado**, multiplicada por un **factor de emisión propio de cada material**.

> $CO₂e$ = $Cantidad\ producida \times Factor\ de\ emisión$

💡 Para calcular correctamente solo necesitas la **cantidad total anual producida**, en toneladas.

💡 **Al final de la página hay un ejemplo ilustrativo**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica el proceso y el material

Primero eliges el **Proceso** (Cemento, Cal, Vidrio, Cerámica u otro uso de carbonatos) y después el **Material o método**, que cambia según el proceso:

| Proceso  | Material o método a elegir                                                                   |
| :------- | :------------------------------------------------------------------------------------------- |
| Cemento  | Clinker                                                                                      |
| Cal      | Cal alta en calcio · Cal dolomítica · Cal hidráulica                                         |
| Vidrio   | Vidrio plano (float) · Contenedores · Fibra de vidrio · Vajilla · Iluminación · Especialidad |
| Cerámica | Sin material predefinido: debes declarar tu propio factor                                    |

⚠️ Si produces más de un material, **agrega una línea por cada uno**.

---

### 2️⃣ Recolecta la cantidad anual producida

Debes identificar la **cantidad total producida o utilizada durante el año**, en toneladas.

Puedes obtener esta información desde:

- Reportes de producción de planta
- Balances de masa
- Informes operacionales
- Declaraciones ambientales regulatorias
- Registros de consumo de materias primas
- ERP o sistemas internos de producción

⚠️ La cantidad debe corresponder al **total anual**, no a la capacidad instalada.

---

### 3️⃣ Si no tienes el total anual consolidado

#### **Opción 1:** Sumar la producción mensual

> **Producción anual** = Suma de la producción de los 12 meses

_Ejemplo:_ si produces en promedio **80.000 toneladas mensuales de clinker**:

**Toneladas anuales** = $80.000 \times 12$ = **960.000 toneladas/año**

---

#### **Opción 2:** Estimar desde el producto final

Si conoces la producción de cemento y el contenido de clinker de la mezcla:

> **Clinker utilizado** = $Cemento\ producido \times contenido\ de\ clinker$

_Ejemplo:_ con **1.200.000 toneladas** de cemento y un contenido promedio de clinker de **75%**:

**Toneladas de clinker** = $1.200.000 \times 0,75$ = **900.000 toneladas**

⚠️ Declara los supuestos utilizados si aplicas esta aproximación.

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir la cantidad anual**

| Campo             | Qué debes ingresar                |   Ejemplo |
| :---------------- | :-------------------------------- | --------: |
| Proceso           | Proceso mineral que realizas      |   Cemento |
| Material o método | Material producido                |   Clinker |
| Unidad            | Unidad declarada                  | Toneladas |
| Cantidad          | Total anual producido o utilizado | 900.000 t |

⚠️ El campo **"Fuente factor" no debes modificarlo**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Debes rellenar los campos igual que en el Caso 1.

2.- Luego, en el campo **"Fuente factor"**, debes seleccionar **"Factor propio"**.

3.- Debes modificar el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado.

💡 Este es el camino que debes usar para **Cerámica** y para **otros usos de carbonatos**, que no tienen factor por defecto.

---

**CASO 3:** Ya tienes las emisiones totales calculadas externamente

Debes ingresar a la calculadora en **modo experto**. Luego, en el paso 3, debes seleccionar el checkbox **"Sólo quiero ingresar el total de emisiones"**, lo que habilitará el recuadro para ingresar las **emisiones totales del proceso**.

---

### 📌 Ejemplo práctico

Supongamos que durante el año tu empresa utilizó **900.000 toneladas de clinker**, y el factor de emisión del clinker es **520 kg CO₂e por tonelada**:

> $CO₂e$ = $900.000\ t \times 520\ kg\ CO₂e/t$ = $468.000.000\ kg\ CO₂e$

Es decir, el proceso habría generado:

- **468.000 toneladas de CO₂e en el año**

⚠️ Es importante que las **unidades coincidan**. Si el factor está expresado por tonelada, la cantidad debe estar en toneladas.

---

## 📝 Notas importantes

> - Esta sub-categoría aplica solo a empresas que **transforman minerales o carbonatos mediante calor**
> - Los factores por defecto corresponden a los **valores Tier 1 del IPCC**; si tienes datos de planta, un factor propio es siempre más preciso
> - **Cal dolomítica:** el factor por defecto usa el valor recomendado para países en desarrollo. Si tu tecnología es de alta eficiencia, evalúa un factor propio
> - No incluyas combustibles ni electricidad aquí
> - Guarda reportes productivos y balances de masa como respaldo para auditorías o verificaciones externas
