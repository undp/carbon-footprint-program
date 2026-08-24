-- Add the seven new industrial-process subcategories to databases that were
-- already seeded.
--
-- The catalogue lives in seed data, but the seed cannot carry an addition to an
-- installed deployment. seedEmissionFactors runs createMany({ skipDuplicates:
-- true }) over every factor in the dataset, and skipDuplicates cannot deduplicate
-- these rows: the partial unique index covers (subcategory, dimension_value_1,
-- dimension_value_2, source), one of those dimension columns is NULL on most
-- factors, and Postgres treats NULLs as distinct in a unique index. Re-running
-- the seed therefore duplicates every existing factor and then aborts on its own
-- row-count check. Fresh installs get this content from the seed; installed ones
-- get it here.
--
-- Purely additive: nothing existing is updated or deleted. Every statement is
-- guarded by NOT EXISTS, so re-running the migration is a no-op, and on an empty
-- database — an integration-test container, for instance — the category lookup
-- matches nothing and every statement inserts zero rows.
--
-- Content is generated from tools/seed/src/data/base/methodologies.json,
-- initiatives.json and explanations/subcategories/, so it is the same catalogue
-- the seed installs, not a hand-copy of it. Factors come in both kg/ton and kg/kg
-- because the emission editor matches by exact rate-unit denominator.

-- ---------- Procesos industriales - Cal ----------

INSERT INTO "subcategory" ("category_id", "name", "icon", "description", "explanation", "status")
SELECT c."id", 'Procesos industriales - Cal', 'FACTORY', 'Emisiones generadas en la calcinación de caliza o dolomita para producir cal (IPPU 2A2). Corresponde al CO₂ liberado por la descomposición química del carbonato, no a la combustión del horno.', $md$# 🪨 Procesos industriales – Cal

Esta sub-categoría corresponde a **las emisiones generadas en la producción de cal**, específicamente el CO₂ liberado por la **descomposición química de la caliza o la dolomita** al calcinarse.

Está pensada para **empresas productoras de cal viva, cal hidratada o cal dolomítica**.

Aquí se reportan las emisiones que **provienen de la reacción química**, no del consumo de combustible ni de electricidad.

⚠️ No debes incluir aquí:

- Combustión del horno de cal → se reporta en **Combustiones estacionarias**
- Consumo eléctrico → se reporta en **Electricidad (Alcance 2)**
- Transporte de caliza o de producto → se reporta en la categoría correspondiente

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa **produce cal** en hornos verticales, rotatorios o regenerativos?
- ¿Calcinas **caliza (CaCO₃) o dolomita (CaCO₃·MgCO₃)**?
- ¿Produces **cal hidratada** a partir de cal viva propia?
- ¿Tienes registros de **toneladas de cal producidas** durante el año?
- ¿Operas un horno de cal como parte de otro proceso, por ejemplo en una planta de celulosa o de azúcar?

💡 **Tip importante:**
Si la respuesta a **una o más de estas preguntas es SÍ**, entonces tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

---

## ¿Cómo es el cálculo de emisiones?

Las emisiones se calculan sobre la **cantidad de cal producida**, multiplicada por un **factor de emisión según el tipo de cal**.

> $CO₂e$ = $Cal\ producida \times Factor\ de\ emisión$

💡 Para calcular correctamente solo necesitas la **cantidad total anual producida**, en toneladas.

💡 **Al final de la página hay un ejemplo ilustrativo**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica el tipo de cal

| Tipo de cal        | Cuándo corresponde                               |
| :----------------- | :----------------------------------------------- |
| Cal alta en calcio | Cal viva producida a partir de caliza (CaCO₃)    |
| Cal dolomítica     | Cal producida a partir de dolomita (CaCO₃·MgCO₃) |
| Cal hidráulica     | Cal con contenido de sílice que fragua con agua  |

⚠️ Si produces más de un tipo, **agrega una línea por cada uno**: los factores son distintos.

---

### 2️⃣ Recolecta la producción anual

Debes identificar la **cantidad total de cal producida durante el año**, en toneladas. Puedes obtenerla desde:

- Reportes de producción de planta
- Balances de masa del horno
- Registros de despacho y facturación
- Declaraciones ambientales regulatorias
- ERP o sistemas internos de producción

⚠️ Declara **cal producida**, no caliza alimentada al horno, y **total anual**, no capacidad instalada.

---

### 3️⃣ Si no tienes el total anual consolidado

Suma la producción mensual de los 12 meses:

> **Producción anual** = Suma de la producción de los 12 meses

Si solo tienes la caliza alimentada, puedes estimar la cal producida con el rendimiento del horno y **declarar el supuesto utilizado**.

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir la cantidad anual**

| Campo       | Qué debes ingresar    |            Ejemplo |
| :---------- | :-------------------- | -----------------: |
| Tipo de cal | Tipo de cal producida | Cal alta en calcio |
| Unidad      | Unidad declarada      |          Toneladas |
| Cantidad    | Total anual producido |           45.000 t |

⚠️ El campo **"Fuente factor" no debes modificarlo**

---

**CASO 2:** Eres **experto y utilizas factores propios**

1.- Debes rellenar los campos igual que en el Caso 1.

2.- Luego, en el campo **"Fuente factor"**, debes seleccionar **"Otro"**.

3.- Debes modificar el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado.

---

**CASO 3:** Ya tienes las emisiones totales calculadas externamente

Debes ingresar a la calculadora en **modo experto**. Luego, en el paso 3, debes seleccionar el checkbox **"Sólo quiero ingresar el total de emisiones"**.

---

### 📌 Ejemplo práctico

Supongamos que durante el año tu empresa produjo **45.000 toneladas de cal alta en calcio**, con un factor de emisión de **750 kg CO₂e por tonelada**:

> $CO₂e$ = $45.000\ t \times 750\ kg\ CO₂e/t$ = $33.750.000\ kg\ CO₂e$

Es decir, el proceso habría generado:

- **33.750 toneladas de CO₂e en el año**

⚠️ Es importante que las **unidades coincidan**.

---

## 📝 Notas importantes

> - Esta sub-categoría aplica solo a empresas que **calcinan carbonatos para producir cal**
> - Los factores por defecto corresponden a los **valores Tier 1 del IPCC**; si conoces el contenido de CaO de tu producto, un factor propio es más preciso
> - **Cal dolomítica:** el factor por defecto usa el valor recomendado para países en desarrollo. Si tu tecnología es de alta eficiencia, evalúa un factor propio
> - No incluyas combustibles ni electricidad aquí
> - Guarda balances de masa y reportes productivos como respaldo para auditorías o verificaciones externas
$md$, 'ACTIVE'
FROM (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c
WHERE NOT EXISTS (
  SELECT 1 FROM "subcategory" x WHERE x."category_id" = c."id"
    AND x."name" = 'Procesos industriales - Cal' AND x."status" <> 'DELETED');

INSERT INTO "subcategory_measurement_unit" ("subcategory_id", "measurement_unit_id")
SELECT s."id", mu."id"
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN "measurement_unit" mu ON mu."abbreviation" IN ('g', 'kg', 'ton')
WHERE s."name" = 'Procesos industriales - Cal' AND s."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "subcategory_measurement_unit" x
    WHERE x."subcategory_id" = s."id" AND x."measurement_unit_id" = mu."id");

INSERT INTO "emission_factor_dimension" ("subcategory_id", "code", "name", "position", "is_required", "status")
SELECT s."id", 'Procesos industriales - Cal_Tipo de cal', 'Tipo de cal', 1, true, 'ACTIVE'
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
WHERE s."name" = 'Procesos industriales - Cal' AND s."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension" x
    WHERE x."subcategory_id" = s."id" AND x."code" = 'Procesos industriales - Cal_Tipo de cal' AND x."status" <> 'DELETED');

INSERT INTO "emission_factor_dimension_value" ("dimension_id", "value", "parent_value_id", "status")
SELECT d."id", nv."value", NULL, 'ACTIVE'
FROM "emission_factor_dimension" d
JOIN "subcategory" s ON s."id" = d."subcategory_id"
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN (VALUES
  ('Cal alta en calcio', 0),
  ('Cal dolomítica', 1),
  ('Cal hidráulica', 2)
) AS nv("value", "ord") ON TRUE
WHERE s."name" = 'Procesos industriales - Cal' AND d."code" = 'Procesos industriales - Cal_Tipo de cal' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

INSERT INTO "emission_factor" ("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "rate_measurement_unit_id", "source", "gas_details", "value", "status")
SELECT s."id", v."id", NULL, r."id", nf."source", '{}'::jsonb, nf."value", 'ACTIVE'
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN "emission_factor_dimension" d ON d."subcategory_id" = s."id"
JOIN (VALUES
  ('Cal alta en calcio', 'kg/ton', 'IPCC', 750),
  ('Cal alta en calcio', 'kg/kg', 'IPCC', 0.75),
  ('Cal dolomítica', 'kg/ton', 'IPCC', 770),
  ('Cal dolomítica', 'kg/kg', 'IPCC', 0.77),
  ('Cal hidráulica', 'kg/ton', 'IPCC', 590),
  ('Cal hidráulica', 'kg/kg', 'IPCC', 0.59)
) AS nf("value_name", "rate_unit", "source", "value") ON TRUE
JOIN "emission_factor_dimension_value" v ON v."dimension_id" = d."id" AND v."value" = nf."value_name"
JOIN "rate_measurement_unit" r ON r."abbreviation" = nf."rate_unit"
WHERE s."name" = 'Procesos industriales - Cal' AND s."status" <> 'DELETED' AND v."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor" x
    WHERE x."subcategory_id" = s."id" AND x."dimension_value_1_id" = v."id"
      AND x."rate_measurement_unit_id" = r."id" AND x."source" = nf."source"
      AND x."status" <> 'DELETED');

INSERT INTO "reduction_plan_initiative" ("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "title", "description", "status")
SELECT s."id", NULL, NULL, ni."title", ni."description", 'ACTIVE'
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN (VALUES
  ('Captura de CO₂ en el horno de cal', $md$Evaluar captura de carbono en la corriente de gases del horno, la única vía que reduce las emisiones inherentes a la descarbonatación del carbonato de calcio.$md$),
  ('Optimización del grado de calcinación', $md$Ajustar temperatura y tiempo de residencia para evitar sobrecalcinación, reduciendo el consumo de caliza y de combustible por tonelada de cal.$md$)
) AS ni("title", "description") ON TRUE
WHERE s."name" = 'Procesos industriales - Cal' AND s."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "reduction_plan_initiative" x
    WHERE x."subcategory_id" = s."id" AND x."title" = ni."title" AND x."status" <> 'DELETED');


-- ---------- Procesos industriales - Aluminio ----------

INSERT INTO "subcategory" ("category_id", "name", "icon", "description", "explanation", "status")
SELECT c."id", 'Procesos industriales - Aluminio', 'FACTORY', 'Emisiones de proceso de la producción primaria de aluminio (IPPU 2C3). El factor por defecto cubre solo el CO₂ de oxidación del ánodo de carbono; las emisiones de PFC del efecto ánodo deben declararse aparte.', $md$# 🥫 Procesos industriales – Aluminio

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
$md$, 'ACTIVE'
FROM (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c
WHERE NOT EXISTS (
  SELECT 1 FROM "subcategory" x WHERE x."category_id" = c."id"
    AND x."name" = 'Procesos industriales - Aluminio' AND x."status" <> 'DELETED');

INSERT INTO "subcategory_measurement_unit" ("subcategory_id", "measurement_unit_id")
SELECT s."id", mu."id"
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN "measurement_unit" mu ON mu."abbreviation" IN ('g', 'kg', 'ton')
WHERE s."name" = 'Procesos industriales - Aluminio' AND s."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "subcategory_measurement_unit" x
    WHERE x."subcategory_id" = s."id" AND x."measurement_unit_id" = mu."id");

INSERT INTO "emission_factor_dimension" ("subcategory_id", "code", "name", "position", "is_required", "status")
SELECT s."id", 'Procesos industriales - Aluminio_Tecnología de celda', 'Tecnología de celda', 1, true, 'ACTIVE'
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
WHERE s."name" = 'Procesos industriales - Aluminio' AND s."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension" x
    WHERE x."subcategory_id" = s."id" AND x."code" = 'Procesos industriales - Aluminio_Tecnología de celda' AND x."status" <> 'DELETED');

INSERT INTO "emission_factor_dimension_value" ("dimension_id", "value", "parent_value_id", "status")
SELECT d."id", nv."value", NULL, 'ACTIVE'
FROM "emission_factor_dimension" d
JOIN "subcategory" s ON s."id" = d."subcategory_id"
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN (VALUES
  ('Ánodo precocido (Prebake), solo CO₂ de ánodo', 0),
  ('Søderberg, solo CO₂ de ánodo', 1)
) AS nv("value", "ord") ON TRUE
WHERE s."name" = 'Procesos industriales - Aluminio' AND d."code" = 'Procesos industriales - Aluminio_Tecnología de celda' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

INSERT INTO "emission_factor" ("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "rate_measurement_unit_id", "source", "gas_details", "value", "status")
SELECT s."id", v."id", NULL, r."id", nf."source", '{}'::jsonb, nf."value", 'ACTIVE'
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN "emission_factor_dimension" d ON d."subcategory_id" = s."id"
JOIN (VALUES
  ('Ánodo precocido (Prebake), solo CO₂ de ánodo', 'kg/ton', 'IPCC', 1600),
  ('Ánodo precocido (Prebake), solo CO₂ de ánodo', 'kg/kg', 'IPCC', 1.6),
  ('Søderberg, solo CO₂ de ánodo', 'kg/ton', 'IPCC', 1700),
  ('Søderberg, solo CO₂ de ánodo', 'kg/kg', 'IPCC', 1.7)
) AS nf("value_name", "rate_unit", "source", "value") ON TRUE
JOIN "emission_factor_dimension_value" v ON v."dimension_id" = d."id" AND v."value" = nf."value_name"
JOIN "rate_measurement_unit" r ON r."abbreviation" = nf."rate_unit"
WHERE s."name" = 'Procesos industriales - Aluminio' AND s."status" <> 'DELETED' AND v."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor" x
    WHERE x."subcategory_id" = s."id" AND x."dimension_value_1_id" = v."id"
      AND x."rate_measurement_unit_id" = r."id" AND x."source" = nf."source"
      AND x."status" <> 'DELETED');

INSERT INTO "reduction_plan_initiative" ("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "title", "description", "status")
SELECT s."id", NULL, NULL, ni."title", ni."description", 'ACTIVE'
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN (VALUES
  ('Control de efecto ánodo', $md$Reducir la frecuencia y duración de los efectos ánodo mediante control automatizado de celdas, disminuyendo las emisiones de PFC, gases de muy alto potencial de calentamiento.$md$),
  ('Ánodos inertes y mejora del ánodo de carbono', $md$Evaluar tecnologías de ánodo inerte o mejorar la calidad del ánodo de carbono para reducir su consumo por tonelada de aluminio.$md$),
  ('Incremento del aluminio secundario', $md$Aumentar la proporción de chatarra refundida, que evita por completo la electrólisis y sus emisiones de proceso.$md$)
) AS ni("title", "description") ON TRUE
WHERE s."name" = 'Procesos industriales - Aluminio' AND s."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "reduction_plan_initiative" x
    WHERE x."subcategory_id" = s."id" AND x."title" = ni."title" AND x."status" <> 'DELETED');


-- ---------- Procesos industriales - Química ----------

INSERT INTO "subcategory" ("category_id", "name", "icon", "description", "explanation", "status")
SELECT c."id", 'Procesos industriales - Química', 'FACTORY', 'Emisiones de proceso de la industria química (IPPU 2B): amoníaco, ácido nítrico, ácido adípico, carburos, dióxido de titanio, carbonato de sodio, petroquímicos y fluoroquímicos. Los factores del IPCC para estos procesos son por gas, así que debes declarar tu propio factor.', $md$# 🧪 Procesos industriales – Química

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
$md$, 'ACTIVE'
FROM (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c
WHERE NOT EXISTS (
  SELECT 1 FROM "subcategory" x WHERE x."category_id" = c."id"
    AND x."name" = 'Procesos industriales - Química' AND x."status" <> 'DELETED');

INSERT INTO "subcategory_measurement_unit" ("subcategory_id", "measurement_unit_id")
SELECT s."id", mu."id"
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN "measurement_unit" mu ON mu."abbreviation" IN ('g', 'kg', 'ton')
WHERE s."name" = 'Procesos industriales - Química' AND s."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "subcategory_measurement_unit" x
    WHERE x."subcategory_id" = s."id" AND x."measurement_unit_id" = mu."id");

INSERT INTO "emission_factor_dimension" ("subcategory_id", "code", "name", "position", "is_required", "status")
SELECT s."id", 'Procesos industriales - Química_Proceso', 'Proceso', 1, true, 'ACTIVE'
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
WHERE s."name" = 'Procesos industriales - Química' AND s."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension" x
    WHERE x."subcategory_id" = s."id" AND x."code" = 'Procesos industriales - Química_Proceso' AND x."status" <> 'DELETED');

INSERT INTO "emission_factor_dimension_value" ("dimension_id", "value", "parent_value_id", "status")
SELECT d."id", nv."value", NULL, 'ACTIVE'
FROM "emission_factor_dimension" d
JOIN "subcategory" s ON s."id" = d."subcategory_id"
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN (VALUES
  ('Amoníaco', 0),
  ('Ácido nítrico', 1),
  ('Ácido adípico', 2),
  ('Caprolactama, glioxal y ácido glioxílico', 3),
  ('Carburo de calcio', 4),
  ('Carburo de silicio', 5),
  ('Dióxido de titanio', 6),
  ('Carbonato de sodio (soda ash)', 7),
  ('Metanol', 8),
  ('Etileno', 9),
  ('Dicloroetano y monómero de cloruro de vinilo', 10),
  ('Óxido de etileno', 11),
  ('Acrilonitrilo', 12),
  ('Negro de humo', 13),
  ('Fluoroquímicos', 14),
  ('Otro', 15)
) AS nv("value", "ord") ON TRUE
WHERE s."name" = 'Procesos industriales - Química' AND d."code" = 'Procesos industriales - Química_Proceso' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

INSERT INTO "reduction_plan_initiative" ("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "title", "description", "status")
SELECT s."id", NULL, NULL, ni."title", ni."description", 'ACTIVE'
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN (VALUES
  ('Instalación de catalizadores de destrucción de N₂O', $md$En plantas de ácido nítrico y adípico, instalar catalizadores secundarios o terciarios de descomposición de N₂O, con potencial de reducción superior al 90% del gas de proceso.$md$),
  ('Hidrógeno de bajas emisiones para amoníaco', $md$Sustituir el reformado de gas natural por hidrógeno producido con electrólisis y energía renovable, eliminando el CO₂ de proceso de la síntesis de amoníaco.$md$),
  ('Recuperación y valorización de gases de proceso', $md$Capturar corrientes de CO₂ y compuestos fluorados del proceso para reutilización interna o destrucción controlada en lugar de venteo.$md$)
) AS ni("title", "description") ON TRUE
WHERE s."name" = 'Procesos industriales - Química' AND s."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "reduction_plan_initiative" x
    WHERE x."subcategory_id" = s."id" AND x."title" = ni."title" AND x."status" <> 'DELETED');


-- ---------- Procesos industriales - Ferroaleaciones y otros metales ----------

INSERT INTO "subcategory" ("category_id", "name", "icon", "description", "explanation", "status")
SELECT c."id", 'Procesos industriales - Ferroaleaciones y otros metales', 'FACTORY', 'Emisiones de proceso de ferroaleaciones, plomo y magnesio (IPPU 2C2, 2C4 y 2C5). Corresponde al carbono consumido como agente reductor, no a la combustión ni al consumo eléctrico del horno.', $md$# 🔗 Procesos industriales – Ferroaleaciones y otros metales

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

| Grupo           | Opciones disponibles                                                                                                                       |
| :-------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| Ferroaleaciones | Ferrosilicio 45/65/75/90% Si · Ferromanganeso (7% C y 1% C) · Silicomanganeso · Silicio metálico · Ferrocromo (con y sin planta de sínter) |
| Plomo           | Horno Imperial Smelting (ISF) · Fundición directa (DS) · Materias primas secundarias · Promedio por defecto                                |
| Magnesio        | Sin factor por defecto: debes declarar tu propio factor                                                                                    |

⚠️ Si produces varias aleaciones, **agrega una línea por cada una**: los factores son muy distintos entre sí.

⚠️ Si no conoces la ruta de plomo, usa el **Promedio por defecto** y déjalo documentado.

⚠️ **Ferrocromo:** el factor sube de 1.300 a 1.600 kg CO₂e por tonelada si tu planta tiene **sínter propio**, porque la sinterización del mineral de cromo también libera CO₂. Elige la opción que corresponda a tu instalación.

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

2.- Luego, en el campo **"Fuente factor"**, debes seleccionar **"Otro"**.

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
$md$, 'ACTIVE'
FROM (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c
WHERE NOT EXISTS (
  SELECT 1 FROM "subcategory" x WHERE x."category_id" = c."id"
    AND x."name" = 'Procesos industriales - Ferroaleaciones y otros metales' AND x."status" <> 'DELETED');

INSERT INTO "subcategory_measurement_unit" ("subcategory_id", "measurement_unit_id")
SELECT s."id", mu."id"
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN "measurement_unit" mu ON mu."abbreviation" IN ('g', 'kg', 'ton')
WHERE s."name" = 'Procesos industriales - Ferroaleaciones y otros metales' AND s."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "subcategory_measurement_unit" x
    WHERE x."subcategory_id" = s."id" AND x."measurement_unit_id" = mu."id");

INSERT INTO "emission_factor_dimension" ("subcategory_id", "code", "name", "position", "is_required", "status")
SELECT s."id", 'Procesos industriales - Ferroaleaciones y otros metales_Producto o proceso', 'Producto o proceso', 1, true, 'ACTIVE'
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
WHERE s."name" = 'Procesos industriales - Ferroaleaciones y otros metales' AND s."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension" x
    WHERE x."subcategory_id" = s."id" AND x."code" = 'Procesos industriales - Ferroaleaciones y otros metales_Producto o proceso' AND x."status" <> 'DELETED');

INSERT INTO "emission_factor_dimension_value" ("dimension_id", "value", "parent_value_id", "status")
SELECT d."id", nv."value", NULL, 'ACTIVE'
FROM "emission_factor_dimension" d
JOIN "subcategory" s ON s."id" = d."subcategory_id"
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN (VALUES
  ('Ferrosilicio 45% Si', 0),
  ('Ferrosilicio 65% Si', 1),
  ('Ferrosilicio 75% Si', 2),
  ('Ferrosilicio 90% Si', 3),
  ('Ferromanganeso (7% C)', 4),
  ('Ferromanganeso (1% C)', 5),
  ('Silicomanganeso', 6),
  ('Silicio metálico', 7),
  ('Ferrocromo (sin planta de sínter)', 8),
  ('Ferrocromo (con planta de sínter)', 9),
  ('Plomo, horno Imperial Smelting (ISF)', 10),
  ('Plomo, fundición directa (DS)', 11),
  ('Plomo, materias primas secundarias', 12),
  ('Plomo, promedio por defecto (80% ISF, 20% DS)', 13),
  ('Magnesio', 14),
  ('Otro', 15)
) AS nv("value", "ord") ON TRUE
WHERE s."name" = 'Procesos industriales - Ferroaleaciones y otros metales' AND d."code" = 'Procesos industriales - Ferroaleaciones y otros metales_Producto o proceso' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

INSERT INTO "emission_factor" ("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "rate_measurement_unit_id", "source", "gas_details", "value", "status")
SELECT s."id", v."id", NULL, r."id", nf."source", '{}'::jsonb, nf."value", 'ACTIVE'
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN "emission_factor_dimension" d ON d."subcategory_id" = s."id"
JOIN (VALUES
  ('Ferrosilicio 45% Si', 'kg/ton', 'IPCC', 2500),
  ('Ferrosilicio 45% Si', 'kg/kg', 'IPCC', 2.5),
  ('Ferrosilicio 65% Si', 'kg/ton', 'IPCC', 3600),
  ('Ferrosilicio 65% Si', 'kg/kg', 'IPCC', 3.6),
  ('Ferrosilicio 75% Si', 'kg/ton', 'IPCC', 4000),
  ('Ferrosilicio 75% Si', 'kg/kg', 'IPCC', 4),
  ('Ferrosilicio 90% Si', 'kg/ton', 'IPCC', 4800),
  ('Ferrosilicio 90% Si', 'kg/kg', 'IPCC', 4.8),
  ('Ferromanganeso (7% C)', 'kg/ton', 'IPCC', 1300),
  ('Ferromanganeso (7% C)', 'kg/kg', 'IPCC', 1.3),
  ('Ferromanganeso (1% C)', 'kg/ton', 'IPCC', 1500),
  ('Ferromanganeso (1% C)', 'kg/kg', 'IPCC', 1.5),
  ('Silicomanganeso', 'kg/ton', 'IPCC', 1400),
  ('Silicomanganeso', 'kg/kg', 'IPCC', 1.4),
  ('Silicio metálico', 'kg/ton', 'IPCC', 5000),
  ('Silicio metálico', 'kg/kg', 'IPCC', 5),
  ('Ferrocromo (sin planta de sínter)', 'kg/ton', 'IPCC', 1300),
  ('Ferrocromo (sin planta de sínter)', 'kg/kg', 'IPCC', 1.3),
  ('Ferrocromo (con planta de sínter)', 'kg/ton', 'IPCC', 1600),
  ('Ferrocromo (con planta de sínter)', 'kg/kg', 'IPCC', 1.6),
  ('Plomo, horno Imperial Smelting (ISF)', 'kg/ton', 'IPCC', 590),
  ('Plomo, horno Imperial Smelting (ISF)', 'kg/kg', 'IPCC', 0.59),
  ('Plomo, fundición directa (DS)', 'kg/ton', 'IPCC', 250),
  ('Plomo, fundición directa (DS)', 'kg/kg', 'IPCC', 0.25),
  ('Plomo, materias primas secundarias', 'kg/ton', 'IPCC', 200),
  ('Plomo, materias primas secundarias', 'kg/kg', 'IPCC', 0.2),
  ('Plomo, promedio por defecto (80% ISF, 20% DS)', 'kg/ton', 'IPCC', 520),
  ('Plomo, promedio por defecto (80% ISF, 20% DS)', 'kg/kg', 'IPCC', 0.52)
) AS nf("value_name", "rate_unit", "source", "value") ON TRUE
JOIN "emission_factor_dimension_value" v ON v."dimension_id" = d."id" AND v."value" = nf."value_name"
JOIN "rate_measurement_unit" r ON r."abbreviation" = nf."rate_unit"
WHERE s."name" = 'Procesos industriales - Ferroaleaciones y otros metales' AND s."status" <> 'DELETED' AND v."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor" x
    WHERE x."subcategory_id" = s."id" AND x."dimension_value_1_id" = v."id"
      AND x."rate_measurement_unit_id" = r."id" AND x."source" = nf."source"
      AND x."status" <> 'DELETED');

INSERT INTO "reduction_plan_initiative" ("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "title", "description", "status")
SELECT s."id", NULL, NULL, ni."title", ni."description", 'ACTIVE'
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN (VALUES
  ('Sustitución parcial del reductor por biocarbono', $md$Reemplazar parte del coque o carbón mineral por carbón vegetal certificado, reduciendo el carbono fósil del proceso de reducción.$md$),
  ('Optimización del consumo de reductor', $md$Ajustar la operación del horno de arco sumergido para acercarse al requerimiento estequiométrico y reducir el exceso de carbono fijo.$md$),
  ('Incremento de materias primas secundarias', $md$Aumentar el uso de chatarra y materiales reciclados, que evitan la reducción química del mineral y sus emisiones de proceso.$md$)
) AS ni("title", "description") ON TRUE
WHERE s."name" = 'Procesos industriales - Ferroaleaciones y otros metales' AND s."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "reduction_plan_initiative" x
    WHERE x."subcategory_id" = s."id" AND x."title" = ni."title" AND x."status" <> 'DELETED');


-- ---------- Procesos industriales - Papel y celulosa ----------

INSERT INTO "subcategory" ("category_id", "name", "icon", "description", "explanation", "status")
SELECT c."id", 'Procesos industriales - Papel y celulosa', 'FACTORY', 'Emisiones de proceso de la industria de pulpa y papel (IPPU 2H1), principalmente la calcinación de carbonato de calcio en el horno de cal de la planta. No incluye la combustión de biomasa ni de combustibles fósiles.', $md$# 📄 Procesos industriales – Papel y celulosa

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
| Otro                         | Cualquier otra emisión de proceso, descrita en el comentario |

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

| Campo                | Qué debes ingresar    |                    Ejemplo |
| :------------------- | :-------------------- | -------------------------: |
| Proceso              | Proceso que declaras  |  Horno de cal de la planta |
| Unidad               | Unidad declarada      |                  Toneladas |
| Cantidad             | Total anual           |                   15.000 t |
| Fuente factor        | Selecciona **"Otro"** |                       Otro |
| Factor kgCO₂e/unidad | Tu factor             |                        440 |
| Comentario           | Supuesto utilizado    | Estequiometría CaCO₃, 0,44 |

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

> - Esta sub-categoría **no trae factores por defecto**: siempre debes usar **"Otro"** como **"Fuente factor"** y documentar de dónde viene
> - **No incluyas la combustión de biomasa** aquí: el CO₂ biogénico se reporta por separado y con criterios distintos
> - La emisión del horno de cal es de **origen fósil** aunque la planta opere principalmente con biomasa: por eso importa declararla
> - Si repones poca caliza fresca porque tu circuito de recuperación es muy cerrado, la emisión será baja: **decláralo igual** para que el inventario quede completo
> - Guarda balances del circuito de recuperación y registros de compra de caliza como respaldo para auditorías o verificaciones externas
$md$, 'ACTIVE'
FROM (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c
WHERE NOT EXISTS (
  SELECT 1 FROM "subcategory" x WHERE x."category_id" = c."id"
    AND x."name" = 'Procesos industriales - Papel y celulosa' AND x."status" <> 'DELETED');

INSERT INTO "subcategory_measurement_unit" ("subcategory_id", "measurement_unit_id")
SELECT s."id", mu."id"
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN "measurement_unit" mu ON mu."abbreviation" IN ('g', 'kg', 'ton')
WHERE s."name" = 'Procesos industriales - Papel y celulosa' AND s."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "subcategory_measurement_unit" x
    WHERE x."subcategory_id" = s."id" AND x."measurement_unit_id" = mu."id");

INSERT INTO "emission_factor_dimension" ("subcategory_id", "code", "name", "position", "is_required", "status")
SELECT s."id", 'Procesos industriales - Papel y celulosa_Proceso', 'Proceso', 1, true, 'ACTIVE'
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
WHERE s."name" = 'Procesos industriales - Papel y celulosa' AND s."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension" x
    WHERE x."subcategory_id" = s."id" AND x."code" = 'Procesos industriales - Papel y celulosa_Proceso' AND x."status" <> 'DELETED');

INSERT INTO "emission_factor_dimension_value" ("dimension_id", "value", "parent_value_id", "status")
SELECT d."id", nv."value", NULL, 'ACTIVE'
FROM "emission_factor_dimension" d
JOIN "subcategory" s ON s."id" = d."subcategory_id"
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN (VALUES
  ('Horno de cal de la planta', 0),
  ('Producción de pulpa', 1),
  ('Producción de papel y cartón', 2),
  ('Otro', 3)
) AS nv("value", "ord") ON TRUE
WHERE s."name" = 'Procesos industriales - Papel y celulosa' AND d."code" = 'Procesos industriales - Papel y celulosa_Proceso' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

INSERT INTO "reduction_plan_initiative" ("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "title", "description", "status")
SELECT s."id", NULL, NULL, ni."title", ni."description", 'ACTIVE'
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN (VALUES
  ('Reducción de la reposición de carbonato en el horno de cal', $md$Optimizar el circuito de recuperación de cal para minimizar la caliza fresca que entra al horno y se descarbonata.$md$),
  ('Electrificación del horno de cal', $md$Evaluar tecnologías de calcinación eléctrica alimentadas con energía renovable, desplazando emisiones de combustión hacia el Alcance 2.$md$)
) AS ni("title", "description") ON TRUE
WHERE s."name" = 'Procesos industriales - Papel y celulosa' AND s."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "reduction_plan_initiative" x
    WHERE x."subcategory_id" = s."id" AND x."title" = ni."title" AND x."status" <> 'DELETED');


-- ---------- Procesos industriales - Cerámica y otros carbonatos ----------

INSERT INTO "subcategory" ("category_id", "name", "icon", "description", "explanation", "status")
SELECT c."id", 'Procesos industriales - Cerámica y otros carbonatos', 'FACTORY', 'Emisiones por otros usos de carbonatos en procesos productivos (IPPU 2A4): cocción de cerámica, uso de carbonato de sodio y producción de magnesia no metalúrgica.', $md$# 🏺 Procesos industriales – Cerámica y otros carbonatos

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
$md$, 'ACTIVE'
FROM (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c
WHERE NOT EXISTS (
  SELECT 1 FROM "subcategory" x WHERE x."category_id" = c."id"
    AND x."name" = 'Procesos industriales - Cerámica y otros carbonatos' AND x."status" <> 'DELETED');

INSERT INTO "subcategory_measurement_unit" ("subcategory_id", "measurement_unit_id")
SELECT s."id", mu."id"
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN "measurement_unit" mu ON mu."abbreviation" IN ('g', 'kg', 'ton')
WHERE s."name" = 'Procesos industriales - Cerámica y otros carbonatos' AND s."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "subcategory_measurement_unit" x
    WHERE x."subcategory_id" = s."id" AND x."measurement_unit_id" = mu."id");

INSERT INTO "emission_factor_dimension" ("subcategory_id", "code", "name", "position", "is_required", "status")
SELECT s."id", 'Procesos industriales - Cerámica y otros carbonatos_Proceso', 'Proceso', 1, true, 'ACTIVE'
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
WHERE s."name" = 'Procesos industriales - Cerámica y otros carbonatos' AND s."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension" x
    WHERE x."subcategory_id" = s."id" AND x."code" = 'Procesos industriales - Cerámica y otros carbonatos_Proceso' AND x."status" <> 'DELETED');

INSERT INTO "emission_factor_dimension_value" ("dimension_id", "value", "parent_value_id", "status")
SELECT d."id", nv."value", NULL, 'ACTIVE'
FROM "emission_factor_dimension" d
JOIN "subcategory" s ON s."id" = d."subcategory_id"
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN (VALUES
  ('Cerámica (ladrillos y tejas)', 0),
  ('Cerámica (sanitarios y revestimientos)', 1),
  ('Otros usos de carbonato de sodio', 2),
  ('Producción de magnesia no metalúrgica', 3),
  ('Otro', 4)
) AS nv("value", "ord") ON TRUE
WHERE s."name" = 'Procesos industriales - Cerámica y otros carbonatos' AND d."code" = 'Procesos industriales - Cerámica y otros carbonatos_Proceso' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

INSERT INTO "reduction_plan_initiative" ("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "title", "description", "status")
SELECT s."id", NULL, NULL, ni."title", ni."description", 'ACTIVE'
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN (VALUES
  ('Formulación con menor contenido de carbonatos', $md$Reformular pastas y esmaltes para reducir la proporción de carbonatos que se descomponen durante la cocción.$md$),
  ('Optimización de las curvas de cocción', $md$Ajustar las curvas de temperatura del horno para alcanzar las propiedades requeridas con menor descomposición de carbonatos.$md$)
) AS ni("title", "description") ON TRUE
WHERE s."name" = 'Procesos industriales - Cerámica y otros carbonatos' AND s."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "reduction_plan_initiative" x
    WHERE x."subcategory_id" = s."id" AND x."title" = ni."title" AND x."status" <> 'DELETED');


-- ---------- Procesos industriales - Otros ----------

INSERT INTO "subcategory" ("category_id", "name", "icon", "description", "explanation", "status")
SELECT c."id", 'Procesos industriales - Otros', 'FACTORY', 'Emisiones de proceso que no encajan en ninguna otra sub-categoría de procesos industriales (IPPU 2D, 2E, 2G y 2H2): alimentos y bebidas, electrónica, y uso no energético de lubricantes, ceras y solventes. Indica el proceso en el comentario de la línea.', $md$# 🏭 Procesos industriales – Otros

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

Elige el **Proceso** que corresponda. Si ninguno aplica, elige **"Otro"**.

⚠️ Cuando uses **"Otro"**, es **obligatorio** describir de qué proceso se trata en el **comentario de la línea**. Sin esa descripción, la emisión no es verificable y un revisor externo la objetará.

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

| Campo                | Qué debes ingresar    |                 Ejemplo |
| :------------------- | :-------------------- | ----------------------: |
| Proceso              | Proceso que realizas  |      Uso de lubricantes |
| Unidad               | Unidad declarada      |               Toneladas |
| Cantidad             | Total anual consumido |                    40 t |
| Fuente factor        | Selecciona **"Otro"** |                    Otro |
| Factor kgCO₂e/unidad | Tu factor             |                   2.200 |
| Comentario           | Supuesto utilizado    | 20% del carbono oxidado |

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
> - Si eliges **"Otro"**, **describe el proceso en el comentario**. Es la única forma de que la línea sea auditable
> - **No trae factores por defecto**: siempre debes usar **"Otro"** como **"Fuente factor"** y documentar de dónde viene
> - Si el proceso emite **N₂O o gases fluorados**, anota el GWP que usaste para convertir a CO₂e
> - **Documenta tus supuestos.** Las fuentes residuales requieren más estimaciones que las estándar
> - Si la fuente es **muy material** para tu huella, evalúa medición en planta o apoyo de un especialista en GEI
> - Guarda registros de actividad, balances y órdenes de compra como respaldo para auditorías o verificaciones externas
$md$, 'ACTIVE'
FROM (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c
WHERE NOT EXISTS (
  SELECT 1 FROM "subcategory" x WHERE x."category_id" = c."id"
    AND x."name" = 'Procesos industriales - Otros' AND x."status" <> 'DELETED');

INSERT INTO "subcategory_measurement_unit" ("subcategory_id", "measurement_unit_id")
SELECT s."id", mu."id"
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN "measurement_unit" mu ON mu."abbreviation" IN ('g', 'kg', 'ton')
WHERE s."name" = 'Procesos industriales - Otros' AND s."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "subcategory_measurement_unit" x
    WHERE x."subcategory_id" = s."id" AND x."measurement_unit_id" = mu."id");

INSERT INTO "emission_factor_dimension" ("subcategory_id", "code", "name", "position", "is_required", "status")
SELECT s."id", 'Procesos industriales - Otros_Proceso', 'Proceso', 1, true, 'ACTIVE'
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
WHERE s."name" = 'Procesos industriales - Otros' AND s."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension" x
    WHERE x."subcategory_id" = s."id" AND x."code" = 'Procesos industriales - Otros_Proceso' AND x."status" <> 'DELETED');

INSERT INTO "emission_factor_dimension_value" ("dimension_id", "value", "parent_value_id", "status")
SELECT d."id", nv."value", NULL, 'ACTIVE'
FROM "emission_factor_dimension" d
JOIN "subcategory" s ON s."id" = d."subcategory_id"
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN (VALUES
  ('Alimentos y bebidas', 0),
  ('Electrónica y semiconductores', 1),
  ('Uso de lubricantes', 2),
  ('Uso de ceras de parafina', 3),
  ('Uso de solventes', 4),
  ('Otro', 5)
) AS nv("value", "ord") ON TRUE
WHERE s."name" = 'Procesos industriales - Otros' AND d."code" = 'Procesos industriales - Otros_Proceso' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

INSERT INTO "reduction_plan_initiative" ("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "title", "description", "status")
SELECT s."id", NULL, NULL, ni."title", ni."description", 'ACTIVE'
FROM "subcategory" s
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN (VALUES
  ('Sustitución de insumos de alto contenido de carbono fósil', $md$Revisar lubricantes, ceras y solventes y reemplazarlos por alternativas de menor contenido de carbono fósil o de base biológica.$md$),
  ('Recuperación de gases de proceso en línea', $md$Instalar sistemas de captación y tratamiento en los puntos de venteo, priorizando corrientes de gases fluorados y N₂O.$md$),
  ('Medición directa de las emisiones de proceso', $md$Implementar monitoreo o campañas de medición en planta para reemplazar estimaciones con factores propios por datos medidos.$md$)
) AS ni("title", "description") ON TRUE
WHERE s."name" = 'Procesos industriales - Otros' AND s."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "reduction_plan_initiative" x
    WHERE x."subcategory_id" = s."id" AND x."title" = ni."title" AND x."status" <> 'DELETED');
