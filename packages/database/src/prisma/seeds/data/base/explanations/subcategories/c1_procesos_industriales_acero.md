# 🏭 Procesos industriales – Acero

Esta categoría corresponde a **las emisiones generadas en la producción y procesamiento del acero**, específicamente aquellas derivadas de **reacciones químicas en altos hornos, acerías y otros procesos industriales**.

Incluye emisiones generadas durante:

- Reducción del mineral de hierro
- Uso de coque y agentes reductores
- Conversión de arrabio a acero
- Procesos de refinación metalúrgica

Aquí se reportan las emisiones que **provienen del proceso químico del acero**, no del consumo energético.

⚠️ No debes incluir aquí:

- Combustión de combustibles → se reporta en **Combustiones estacionarias**
- Consumo eléctrico → se reporta en **Electricidad (Alcance 2)**
- Transporte de materias primas → se reporta en la categoría correspondiente

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa produce acero a partir de mineral de hierro o chatarra?
- ¿Operas un alto horno o compras arrabio para convertirlo en acero?
- ¿Utilizas un convertidor BOF para producir acero?
- ¿Operas un horno eléctrico (AEF) para fundir chatarra?
- ¿Tienes registros de toneladas de acero crudo producidas durante el año?
- ¿Realizas procesos de refinación secundaria (metalurgia en cuchara)?
- ¿Generas escoria, gases de proceso o subproductos metalúrgicos?

💡 **Tip importante:**
Si tu empresa **transforma hierro, arrabio o chatarra en acero mediante procesos metalúrgicos**, o si la respuesta a **una o más de estas preguntas es SÍ**, entonces probablemente **debe medir y declarar emisiones en esta sub-categoría**.

---

## ¿Cómo es el cálculo de emisiones?

Las emisiones se calculan en base a la **cantidad total de acero producido**, multiplicado por un **factor de emisión específico según el método de fabricación**.

> $CO₂e$ = $Acero\ producido \times Factor\ de\ emisión$

💡 El método de fabricación es clave, ya que los factores de emisión varían significativamente entre tecnologías.

💡 **Al final de la página hay un ejemplo ilustrativo**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica el método de fabricación utilizado

Debes seleccionar el método que represente el proceso principal de producción:

- Horno básico de oxígeno (BOF)
- Horno de acero eléctrico (AEF)
- Horno de solera (OHF)
- Otro proceso

⚠️ Si utilizas más de un método, debes declararlos por separado.

---

### 2️⃣ Recolecta la información de producción anual

Debes identificar la **cantidad total de acero crudo producido durante el año**.

Puedes obtener esta información desde:

- Reportes diarios de coladas
- Registro de producción por convertidor o horno
- Sistema MES (Manufacturing Execution System)
- Balances metalúrgicos
- Declaraciones ambientales regulatorias
- Reportes enviados a asociaciones siderúrgicas
- ERP o informes de control de producción
- Registros de despacho de acero primario

⚠️ La cantidad debe corresponder a **acero crudo producido**, no productos terminados (barras, planchas, perfiles).

---

### 3️⃣ Si no tienes la producción anual consolidada

#### **Opción 1:** Sumar producción mensual

Si tienes reportes mensuales:

> **Acero anual** = Suma de producción mensual de los 12 meses

_Ejemplo:_

Si produces en promedio **50.000 toneladas mensuales de acero**:

**Toneladas anuales de acero producido** = $50.000 \times 12$ = **600.000 toneladas/año**

---

#### **Opción 2:** Estimar desde carga metálica procesada

Si conoces la cantidad de arrabio o chatarra procesada y el rendimiento promedio:

> **Acero producido** = $Carga\ metálica \times Rendimiento$

_Ejemplo:_

- Carga metálica anual: **650.000 toneladas**
- Rendimiento promedio del proceso: **92%**

**Toneladas anuales de acero producido** = $650.000 \times 0,92$ = **598.000 toneladas de acero**

⚠️ Declara los supuestos utilizados si aplicas esta aproximación.

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir la cantidad anual**

Debes rellenar los siguientes campos:

| Campo                 | Qué debes ingresar              |                       Ejemplo |
| :-------------------- | :------------------------------ | ----------------------------: |
| Método de fabricación | Tecnología principal utilizada  | Horno básico de oxígeno (BOF) |
| Unidad                | Unidad declarada                |                     Toneladas |
| Cantidad              | Producción anual de acero crudo |                     600.000 t |

⚠️ El campo **"Fuente factor" no debes modificarlo**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Debes rellenar los campos igual que en el Caso 1.

2.- Luego, en el campo **"Fuente factor"**, debes seleccionar **"Factor propio"**.

3.- Debes modificar el campo **"Factor kgCO₂/unidad"** con tu valor personalizado.

⚠️ **Importante:** El campo espera el factor en **kgCO₂/unidad**. Si tu fuente expresa el factor en toneladas de CO₂e, debes convertirlo multiplicando por 1.000.
_Ejemplo:_ 1,8 t CO₂e/tonelada = **1.800 kgCO₂/tonelada**.

---

**CASO 3:** Ya tienes las emisiones totales calculadas externamente

Debes ingresar a la calculadora en **modo experto**.
Luego, en el paso 3, debes seleccionar el checkbox **"Sólo quiero ingresar el total de emisiones"**, lo que habilitará el recuadro para ingresar las **emisiones totales del proceso industrial del acero**.

---

### 📌 Ejemplo práctico

Supongamos que durante el año tu planta produjo:

- **600.000 toneladas de acero crudo**
- Mediante **Horno básico de oxígeno (BOF)**

Y el factor de emisión es (ejemplo referencial):

- **1.800 kgCO₂e por tonelada de acero** (equivalente a 1,8 t CO₂e/tonelada)

En la plataforma ingresarías **1800** en el campo **"Factor kgCO₂/unidad"**.

Entonces:

> $CO₂e$ = $600.000\ t \times 1.800\ kgCO₂e/t$ = $1.080.000.000\ kgCO₂e$ = $1.080.000\ t\ CO₂e$

Es decir, el proceso productivo habría generado:

- **1.080.000 toneladas de CO₂e en el año**

⚠️ Es importante que las **unidades coincidan**.
Recuerda que el campo **"Factor kgCO₂/unidad"** espera el valor en **kilogramos**, no en toneladas. Si tu fuente indica el factor en toneladas, multiplica por 1.000 antes de ingresarlo.

---

## 📝 Notas importantes

> - Declara el método de fabricación correcto
> - Reporta acero crudo producido, no productos laminados
> - No incluyas combustibles ni electricidad aquí
> - Guarda balances metalúrgicos y reportes de producción como respaldo para auditorías o verificaciones externas
