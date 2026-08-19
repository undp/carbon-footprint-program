# 📄 Procesos industriales – Papel y celulosa

Esta sub-categoría corresponde a **las emisiones de proceso de la industria de pulpa y papel**, principalmente el CO₂ que se libera al **calcinar carbonato de calcio en el horno de cal** del circuito de recuperación.

Está pensada para **plantas de celulosa, papel y cartón** que operan procesos químicos propios.

⚠️ No debes incluir aquí:

- Combustión de biomasa, licor negro o combustibles fósiles → se reporta en **Combustiones estacionarias**
- Consumo eléctrico → se reporta en **Electricidad (Alcance 2)**
- Disposición de lodos y residuos → se reporta en **Disposición de residuos sólidos**
- Tratamiento de efluentes → se reporta en **Consumo de agua y tratamiento de aguas residuales**

💡 En una planta de celulosa la mayor parte de las emisiones es de **combustión de biomasa**, que se declara aparte. Esta sub-categoría cubre solo la fracción **de proceso**, que suele ser menor pero es de origen fósil.

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu planta opera un **horno de cal** propio dentro del circuito de recuperación?
- ¿Repones **caliza fresca (CaCO₃)** en el circuito de causticación?
- ¿Produces **pulpa química** (kraft o al sulfito)?
- ¿Usas **carbonato de calcio precipitado** como carga o recubrimiento del papel?
- ¿Tienes registros de **consumo anual de caliza** o de producción del horno de cal?

💡 **Tip importante:**
Si operas un horno de cal o repones carbonatos en el proceso, **debes declarar emisiones en esta sub-categoría**.

---

## ¿Cómo es el cálculo de emisiones?

> $CO₂e$ = $Cantidad\ de\ actividad \times Factor\ de\ emisión$

⚠️ **Esta sub-categoría no trae factores por defecto**, porque el valor depende de la configuración del circuito de recuperación de cada planta y de cuánta caliza fresca entra al horno.

💡 Si tu dato es **caliza fresca calcinada**, la estequiometría de la descomposición del CaCO₃ da **0,44 toneladas de CO₂ por tonelada de carbonato**, es decir **440 kg CO₂e por tonelada**. Es un punto de partida defendible.

💡 **Al final de la página hay un ejemplo ilustrativo**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica el proceso

| Proceso                      | Qué declarar                                                 |
| :--------------------------- | :----------------------------------------------------------- |
| Horno de cal de la planta    | Toneladas de carbonato de calcio calcinado en el año         |
| Producción de pulpa          | Otras emisiones de proceso del cocimiento químico            |
| Producción de papel y cartón | Emisiones de proceso de cargas y recubrimientos              |
| Otro proceso de la planta    | Cualquier otra emisión de proceso, descrita en el comentario |

⚠️ Si declaras más de un proceso, **agrega una línea por cada uno**.

---

### 2️⃣ Recolecta la cantidad anual

Puedes obtener la información desde:

- Balances del circuito de recuperación y del horno de cal
- Registros de compra y consumo de caliza
- Reportes de producción de pulpa y papel
- Declaraciones ambientales regulatorias
- ERP o sistemas internos de producción

⚠️ El consumo neto de caliza es **compras menos variación de inventario**, no solo las compras del año.

---

### 3️⃣ Determina tu factor de emisión

**Opción 1 – Balance de carbono del circuito.** Si conoces la caliza fresca que entra al horno y la fracción que se descarbonata, calcula el factor directamente. Es el camino más defendible.

**Opción 2 – Estequiometría.** Usa **440 kg CO₂e por tonelada de CaCO₃** calcinado y declara el supuesto.

**Opción 3 – Factor sectorial.** Los protocolos de cálculo de la industria de pulpa y papel publican factores por tonelada de pulpa. Si lo usas, **anota la fuente**.

---

### 4️⃣ Ingreso de la información

**CASO 1:** Declaras la cantidad y **tu propio factor**

| Campo                | Qué debes ingresar             |                    Ejemplo |
| :------------------- | :----------------------------- | -------------------------: |
| Proceso              | Proceso que declaras           |  Horno de cal de la planta |
| Unidad               | Unidad declarada               |                  Toneladas |
| Cantidad             | Total anual                    |                   15.000 t |
| Fuente factor        | Selecciona **"Factor propio"** |              Factor propio |
| Factor kgCO₂e/unidad | Tu factor                      |                        440 |
| Comentario           | Supuesto utilizado             | Estequiometría CaCO₃, 0,44 |

---

**CASO 2:** Ya tienes las emisiones totales calculadas externamente

Debes ingresar a la calculadora en **modo experto**. Luego, en el paso 3, debes seleccionar el checkbox **"Sólo quiero ingresar el total de emisiones"**.

---

### 📌 Ejemplo práctico

Supongamos que tu planta calcinó **15.000 toneladas de carbonato de calcio** en su horno de cal durante el año, y usas el factor estequiométrico de **440 kg CO₂e por tonelada**:

> $CO₂e$ = $15.000\ t \times 440\ kg\ CO₂e/t$ = $6.600.000\ kg\ CO₂e$

Es decir, el proceso habría generado:

- **6.600 toneladas de CO₂e en el año**

⚠️ Es importante que las **unidades coincidan**.

---

## 📝 Notas importantes

> - Esta sub-categoría **no trae factores por defecto**: siempre debes usar **"Factor propio"** y documentar de dónde viene
> - **No incluyas la combustión de biomasa** aquí: el CO₂ biogénico se reporta por separado y con criterios distintos
> - La emisión del horno de cal es de **origen fósil** aunque la planta opere principalmente con biomasa: por eso importa declararla
> - Si repones poca caliza fresca porque tu circuito de recuperación es muy cerrado, la emisión será baja: **decláralo igual** para que el inventario quede completo
> - Guarda balances del circuito de recuperación y registros de compra de caliza como respaldo para auditorías o verificaciones externas
