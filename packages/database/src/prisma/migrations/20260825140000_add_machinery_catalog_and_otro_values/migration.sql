-- Carry this PR's catalogue additions to databases that were already seeded.
--
-- The catalogue lives in seed data, but seed data only reaches a database on its
-- first deploy: `prisma migrate deploy` runs on every deploy, while the seed is a
-- one-shot that skips entirely once the country table has rows
-- (docs/operations/production-deployment.md). An installed deployment therefore
-- never receives the 46 off-road machines, the 15 "Otro" escape hatches or the
-- reworded guides unless a migration carries them.
--
-- Purely additive on the catalogue: 61 dimension values, no rename, no delete, no
-- emission factor touched. Every INSERT is guarded by NOT EXISTS and every UPDATE
-- skips a guide whose text already matches, so re-running the migration changes
-- nothing. On an empty database — an integration-test container, for instance —
-- the category lookup matches nothing and every statement touches zero rows.
--
-- The 13 subcategory guides are overwritten with the version in seed data, which
-- is what the seed itself does to them (seedSubcategoryExplanations updates
-- unconditionally). A deployment that reworded a guide by hand from the
-- explanations maintainer will see this PR's wording instead.
--
-- Scoped to the base methodology of the demo country ('PD' / 'Metodología inicial'), like
-- the industrial-process migrations before it, so a country deployment that
-- maintains its own methodology is untouched and decides for itself whether its
-- catalogue gains an escape hatch.
--
-- Generated from tools/seed/src/data/base/methodologies.json and
-- explanations/subcategories/.

-- ---------- Dimension values ----------

-- Combustiones estacionarias · Tipo · +1
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
  ('Otro')
) AS nv("value") ON TRUE
WHERE s."name" = 'Combustiones estacionarias' AND s."status" <> 'DELETED'
  AND d."code" = 'Combustiones estacionarias_Tipo' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

-- Combustiones estacionarias · Combustible · +1
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
  ('Otro')
) AS nv("value") ON TRUE
WHERE s."name" = 'Combustiones estacionarias' AND s."status" <> 'DELETED'
  AND d."code" = 'Combustiones estacionarias_Combustible' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

-- Combustiones móviles (flota propia) · Tipo · +47
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
  ('Excavadora'),
  ('Excavadora de orugas'),
  ('Miniexcavadora'),
  ('Retroexcavadora'),
  ('Cargador frontal'),
  ('Minicargador'),
  ('Bulldozer'),
  ('Tractor de orugas'),
  ('Motoniveladora'),
  ('Traílla (scraper)'),
  ('Zanjadora'),
  ('Rodillo compactador'),
  ('Compactadora de suelos'),
  ('Perforadora'),
  ('Jumbo de perforación'),
  ('Cargador de bajo perfil (LHD)'),
  ('Camión minero'),
  ('Camión articulado (dumper)'),
  ('Camión fuera de carretera'),
  ('Camión tolva'),
  ('Camión mixer (hormigonera)'),
  ('Camión aljibe'),
  ('Camión pluma'),
  ('Camión grúa'),
  ('Camión recolector de residuos'),
  ('Camión barredor'),
  ('Tractor de patio (yard truck)'),
  ('Grúa móvil'),
  ('Grúa sobre orugas'),
  ('Grúa telescópica'),
  ('Manipulador telescópico'),
  ('Grúa horquilla (montacargas)'),
  ('Apilador de contenedores (reach stacker)'),
  ('Plataforma elevadora'),
  ('Elevador de tijera'),
  ('Pavimentadora de asfalto'),
  ('Fresadora de pavimento'),
  ('Distribuidor de asfalto'),
  ('Bomba de hormigón autopropulsada'),
  ('Tractor agrícola'),
  ('Cosechadora'),
  ('Fumigadora autopropulsada'),
  ('Cosechadora forestal'),
  ('Arrastrador forestal (skidder)'),
  ('Cargador forestal'),
  ('Chipeadora móvil'),
  ('Otro')
) AS nv("value") ON TRUE
WHERE s."name" = 'Combustiones móviles (flota propia)' AND s."status" <> 'DELETED'
  AND d."code" = 'Combustiones móviles (flota propia)_Tipo' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

-- Combustiones móviles (flota propia) · Combustible · +1
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
  ('Otro')
) AS nv("value") ON TRUE
WHERE s."name" = 'Combustiones móviles (flota propia)' AND s."status" <> 'DELETED'
  AND d."code" = 'Combustiones móviles (flota propia)_Combustible' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

-- Emisiones fugitivas · Gas · +1
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
  ('Otro')
) AS nv("value") ON TRUE
WHERE s."name" = 'Emisiones fugitivas' AND s."status" <> 'DELETED'
  AND d."code" = 'Emisiones fugitivas_Gas' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

-- Emisiones por uso de suelo - Ganadería · Tipo de animal · +1
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
  ('Otro')
) AS nv("value") ON TRUE
WHERE s."name" = 'Emisiones por uso de suelo - Ganadería' AND s."status" <> 'DELETED'
  AND d."code" = 'Emisiones por uso de suelo - Ganadería_Tipo de animal' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

-- Emisiones por uso de suelo - Agricultura · Tipo de cultivo · +1
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
  ('Otro')
) AS nv("value") ON TRUE
WHERE s."name" = 'Emisiones por uso de suelo - Agricultura' AND s."status" <> 'DELETED'
  AND d."code" = 'Emisiones por uso de suelo - Agricultura_Tipo de cultivo' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

-- Procesos industriales - Cemento · Material · +1
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
  ('Otro')
) AS nv("value") ON TRUE
WHERE s."name" = 'Procesos industriales - Cemento' AND s."status" <> 'DELETED'
  AND d."code" = 'Procesos industriales - Cemento_Material' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

-- Procesos industriales - Vidrio · Tipo de vidrio · +1
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
  ('Otro')
) AS nv("value") ON TRUE
WHERE s."name" = 'Procesos industriales - Vidrio' AND s."status" <> 'DELETED'
  AND d."code" = 'Procesos industriales - Vidrio_Tipo de vidrio' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

-- Productos comprados · Material · +1
INSERT INTO "emission_factor_dimension_value" ("dimension_id", "value", "parent_value_id", "status")
SELECT d."id", nv."value", NULL, 'ACTIVE'
FROM "emission_factor_dimension" d
JOIN "subcategory" s ON s."id" = d."subcategory_id"
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Otras emisiones indirectas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN (VALUES
  ('Otro')
) AS nv("value") ON TRUE
WHERE s."name" = 'Productos comprados' AND s."status" <> 'DELETED'
  AND d."code" = 'Productos comprados_Material' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

-- Disposición de residuos sólidos · Material · +1
INSERT INTO "emission_factor_dimension_value" ("dimension_id", "value", "parent_value_id", "status")
SELECT d."id", nv."value", NULL, 'ACTIVE'
FROM "emission_factor_dimension" d
JOIN "subcategory" s ON s."id" = d."subcategory_id"
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Otras emisiones indirectas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN (VALUES
  ('Otro')
) AS nv("value") ON TRUE
WHERE s."name" = 'Disposición de residuos sólidos' AND s."status" <> 'DELETED'
  AND d."code" = 'Disposición de residuos sólidos_Material' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

-- Desplazamiento diario de empleados · Tipo · +1
INSERT INTO "emission_factor_dimension_value" ("dimension_id", "value", "parent_value_id", "status")
SELECT d."id", nv."value", NULL, 'ACTIVE'
FROM "emission_factor_dimension" d
JOIN "subcategory" s ON s."id" = d."subcategory_id"
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Otras emisiones indirectas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN (VALUES
  ('Otro')
) AS nv("value") ON TRUE
WHERE s."name" = 'Desplazamiento diario de empleados' AND s."status" <> 'DELETED'
  AND d."code" = 'Desplazamiento diario de empleados_Tipo' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

-- Viajes de negocios - Traslado · Transporte · +1
INSERT INTO "emission_factor_dimension_value" ("dimension_id", "value", "parent_value_id", "status")
SELECT d."id", nv."value", NULL, 'ACTIVE'
FROM "emission_factor_dimension" d
JOIN "subcategory" s ON s."id" = d."subcategory_id"
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Otras emisiones indirectas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN (VALUES
  ('Otro')
) AS nv("value") ON TRUE
WHERE s."name" = 'Viajes de negocios - Traslado' AND s."status" <> 'DELETED'
  AND d."code" = 'Viajes de negocios - Traslado_Transporte' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

-- Transporte y distribución de bienes aguas arriba · Transporte · +1
INSERT INTO "emission_factor_dimension_value" ("dimension_id", "value", "parent_value_id", "status")
SELECT d."id", nv."value", NULL, 'ACTIVE'
FROM "emission_factor_dimension" d
JOIN "subcategory" s ON s."id" = d."subcategory_id"
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Otras emisiones indirectas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN (VALUES
  ('Otro')
) AS nv("value") ON TRUE
WHERE s."name" = 'Transporte y distribución de bienes aguas arriba' AND s."status" <> 'DELETED'
  AND d."code" = 'Transporte y distribución de bienes aguas arriba_Transporte' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

-- Transporte y distribución de bienes aguas abajo · Transporte · +1
INSERT INTO "emission_factor_dimension_value" ("dimension_id", "value", "parent_value_id", "status")
SELECT d."id", nv."value", NULL, 'ACTIVE'
FROM "emission_factor_dimension" d
JOIN "subcategory" s ON s."id" = d."subcategory_id"
JOIN (SELECT c."id" FROM "category" c
      JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
      JOIN "country" co ON co."id" = mv."country_id"
      WHERE c."name" = 'Otras emisiones indirectas' AND mv."name" = 'Metodología inicial'
        AND co."iso_code" = 'PD' AND c."status" <> 'DELETED' ) c ON c."id" = s."category_id"
JOIN (VALUES
  ('Otro')
) AS nv("value") ON TRUE
WHERE s."name" = 'Transporte y distribución de bienes aguas abajo' AND s."status" <> 'DELETED'
  AND d."code" = 'Transporte y distribución de bienes aguas abajo_Transporte' AND d."status" <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM "emission_factor_dimension_value" x
    WHERE x."dimension_id" = d."id" AND x."value" = nv."value" AND x."status" <> 'DELETED');

-- ---------- Subcategory guides (the text behind the (i) icon) ----------

-- Combustiones estacionarias
WITH guide AS (SELECT $md$# 🔥 Combustiones estacionarias

Esta categoría incluye las **emisiones de equipos fijos (no móviles) bajo control de la empresa que consumen combustibles**, tales como **calderas**, **hornos industriales**, **cocinas industriales**, **estufas**, **secadores**, u otros artefactos estacionarios que operen con **diésel**, **gas**, **carbón**, **pellets** u otros combustibles (incluyendo biocombustibles).

Corresponde a fuentes donde la empresa **administra y controla directamente el equipo y el combustible utilizado**.

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa utiliza calderas para procesos productivos o calefacción?
- ¿Operas generadores eléctricos que funcionen con diésel o gas?
- ¿Tienes hornos, cocinas industriales o secadores a gas?
- ¿Utilizas carbón, leña, pellets u otros combustibles en equipos fijos?
- ¿Cuentas con facturas o registros de compra de combustible para estos equipos?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, entonces tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

---

## ¿Cómo es el cálculo de emisiones?

El cálculo de emisiones corresponde a la multiplicación de un **factor de emisión por la cantidad de combustible consumido**.  
El factor depende del **tipo de combustible** y la **unidad declarada**.

> $CO₂e$ = $Cantidad\ consumida \times Factor\ de\ emisión$

💡 **Al final de la página hay un ejemplo ilustrativo.**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica las fuentes estacionarias bajo tu control

Incluye:

- **Calderas** para procesos o calefacción
- **Hornos industriales**
- **Cocinas industriales**
- **Secadores, estufas u otros equipos fijos**
- Equipos que operen con **diésel, gas natural, GLP, carbón, pellets u otros combustibles**

⚠️ Solo debes incluir **equipos fijos bajo control operativo de tu empresa**

---

### 2️⃣ Recolecta la información de consumo

Puedes obtener los datos desde:

- Facturas de compra de combustible
- Registros internos de consumo
- Órdenes de compra
- Contratos de suministro de gas
- Planillas de operación

⚠️ Si el consumo no está en la unidad requerida, puedes **realizar estimaciones razonables y declarar los supuestos utilizados**

---

### 3️⃣ Si no tienes el dato exacto en las unidades requeridas

#### **Opción 1:** Cuando conoces el gasto anual en combustible

> **Cantidad estimada** = $\frac{Gasto\ anual}{Precio\ promedio\ por\ unidad}$

_Ejemplo:_  
Si tu empresa gastó **5.000.000 CLP** en diésel para una caldera y el precio promedio fue **1.250 CLP/L**:

**Litros consumidos al año** = $\frac{5.000.000\ CLP}{1.250\ CLP/L}$ = $4.000\ L/año$

---

#### **Opción 2:** Cuando conoces la potencia y horas de operación del generador

> **Consumo estimado** = $Consumo\ por\ hora \times Horas\ de\ operación\ anual$

_Ejemplo:_  
Si un generador consume **15 L/hora** y operó **800 horas en el año**:

**Litros consumidos al año** = $15 \times 800$ = **12.000 L anuales**

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir la cantidad** y la fuente de emisión

Debes rellenar los siguientes campos:

| Campo           | Qué debes ingresar                                                                                                                                |                                      Ejemplo |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------: |
| Tipo (Opcional) | Qué equipo fijo vas a declarar. Si tu equipo no está en la lista, selecciona **Otro**: este campo es descriptivo y no cambia el factor de emisión | Caldera, Horno industrial, Grupo electrógeno |
| Combustible     | Combustible utilizado por el equipo                                                                                                               |    Gas natural, Diésel, GLP, Carbón, Pellets |
| Unidad          | Unidad en la que se declara el combustible                                                                                                        |                    Litros, m³, kg, toneladas |
| Cantidad        | Total anual consumido por el equipo                                                                                                               |                                    25.000 m³ |

⚠️ No siempre hay factor para todos los combustibles y unidades disponibles

⚠️ El campo **"Fuente factor" no debes modificarlo**

⚠️ Si el combustible que utilizas no está en la lista, selecciona **Otro** y declara tu propio factor de emisión en **"Fuente factor" → "Otro"**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Debes rellenar los campos igual que en el Caso 1.

2.- Luego, en el campo **"Fuente factor"**, debes seleccionar **"Otro"**.

3.- Debes modificar el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado.

---

**CASO 3:** Hiciste el cálculo por fuera y **ya tienes las emisiones totales de la subcategoría**

Debes ingresar a la calculadora en **modo experto**.  
Luego, en el paso 3, debes seleccionar el checkbox **"Sólo quiero ingresar el total de emisiones"**, lo que habilitará el recuadro para ingresar las **emisiones totales de la sub-categoría**.

---

### 📌 Ejemplo práctico

Supongamos que durante el año tu empresa consumió:

- **25.000 m³ de gas natural** en una caldera industrial

Y el factor de emisión del gas natural es (ejemplo referencial):

- **Por cada m³ consumido de gas natural, se generan 1,90 kg CO₂e**

Entonces el cálculo sería:

> $CO₂e$ = $25.000\ m³ \times 1,90\ kg\ CO₂e/m³$ = $47.500\ kg\ CO₂e$

Es decir, las combustiones estacionarias habrían generado:

- **47.500 kg CO₂e en el año**
- O lo mismo que **47,50 toneladas de CO₂e**

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en **kg CO₂e por m³**, la cantidad debe estar en **m³**.

---

## 📝 Notas importantes

> - Incluye solo **equipos fijos bajo control operativo de la empresa**
> - No incluyas combustibles utilizados en **vehículos móviles** (eso corresponde a Combustiones móviles)
> - Los equipos eléctricos no se reportan aquí, sino en **Electricidad (Alcance 2)**
> - Guarda **facturas y registros de consumo** como respaldo para auditorías o certificaciones
$md$::text AS "content")
UPDATE "subcategory" s
SET "explanation" = guide."content"
FROM guide, "category" c
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE s."category_id" = c."id"
  AND c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial' AND co."iso_code" = 'PD'
  AND s."name" = 'Combustiones estacionarias' AND s."status" <> 'DELETED'
  AND s."explanation" IS DISTINCT FROM guide."content";

-- Combustiones móviles (flota propia)
WITH guide AS (SELECT $md$# 🚚 Combustiones móviles

Esta categoría corresponde a **vehículos y maquinarias móviles que consumen combustible o electricidad y son operados o financiados por la empresa**, como **autos**, **camiones**, **buses**, **motocicletas**, **maquinaria**, **barcos**, **vehículos eléctricos (BEVs)** u **otros equipos móviles**.

Un punto relevante es que, si el transporte lo realiza un **proveedor externo** y tu empresa **no tiene control operativo**, ese consumo se reporta en **Transporte de Terceros (Alcance 3)**.

### ⚡ ¿Y los vehículos eléctricos (BEVs)?

El tratamiento depende de **dónde se cargan**:

- **Cargados en sedes o instalaciones de la empresa** (la electricidad la paga tu empresa al medidor de la sede) → declarar el consumo en **Electricidad (Alcance 2)**, no aquí.
- **Cargados externamente** (electrolineras, cargadores públicos pagados por la empresa) → declarar aquí en **Combustiones móviles**, seleccionando **"Electricidad"** como tipo de combustible y unidades en **kWh** o **MWh**.
- **Cargados por el conductor por su cuenta y luego reembolsados** (o no reembolsados) → corresponde a **Alcance 3 (Viajes de negocios / Desplazamiento de empleados)**, no aquí.

⚠️ En ambos casos (Alcance 1 externo o Alcance 2 sede propia) el **factor de emisión es el mismo**: la intensidad del sistema eléctrico nacional (kg CO₂e/kWh). Lo que cambia es la clasificación, no el factor.

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa paga combustible (bencina, diésel, gas o electricidad para BEVs) para vehículos propios o arrendados?
- ¿Utilizas vehículos de la empresa para transportar productos, insumos o personal?
- ¿Tienes autos administrativos, de ventas o gerenciales cuyo combustible paga la empresa?
- ¿Usas maquinaria o equipos móviles que funcionen con combustible (ej. montacargas, maquinaria liviana, generadores móviles)?
- ¿Tienes facturas, boletas o registros de consumo de combustible asociados a la empresa?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, entonces tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

---

## ¿Cómo es el cálculo de emisiones?

El cálculo de emisiones corresponde a la multiplicación de un **factor de emisión por la cantidad consumida**.  
El valor del factor depende del **tipo de combustible** y las **unidades en que se declara el consumo**.

> $CO₂e$ = $Cantidad\ consumida \times Factor\ de\ emisión$

💡 **Al final de la página hay un ejemplo ilustrativo**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica las emisiones provenientes de tus fuentes móviles

Incluye todos los **vehículos propios o arrendados** por tu empresa, como:

- **Vehículos propios**, como autos, camiones, vans, motocicletas, barcos, aviones, helicópteros u otros
- **Vehículos arrendados o en leasing** cuyo combustible es pagado por tu empresa
- **Maquinaria móvil y pesada** (excavadoras, cargadores frontales, motoniveladoras, camiones tolva, grúas, montacargas, tractores agrícolas u otros equipos off-road)
- **Flota operativa** utilizada para almacenaje, logística interna u otras tareas

⚠️ Solo debes incluir **vehículos propios o controlados directamente por tu empresa** (Los que tu empresa paga el combustible)

⚠️ No debes incluir **leasings o subcontratos** si un tercero administra la operación de estos

---

### 2️⃣ Recolecta la información de las cantidades utilizadas

Puedes obtener los datos desde:

- Facturas o boletas de combustible
- Registros internos de abastecimiento
- Bitácoras o libros de ruta
- Planillas de operación o control de flota

⚠️ La información obtenida podría no estar en las unidades que requiere la plataforma. En ese caso, puedes **hacer aproximaciones y declarar los supuestos utilizados**

---

### 3️⃣ Si no tienes el dato en las unidades requeridas, aquí hay aproximaciones

#### **Opción 1:** Estimación de litros cuando tienes el **monto gastado** en combustible

Si sabes cuánto pagas mensualmente por tipo de combustible, la fórmula es:

> **Litros estimados al año** = $\frac{Gasto\ mensual\ en\ combustible \times 12}{Precio\ promedio\ por\ litro}$

_Ejemplo:_

**Litros consumidos al año** = $\frac{600.000\ CLP}{1.400\ CLP/L} \times 12 \approx 5.140\ L/año$

---

#### **Opción 2:** Estimación de litros cuando sabes la cantidad de **kilómetros recorridos**

Si sabes cuántos kilómetros recorrieron tus vehículos en el año:

> **Litros estimados al año** = $\frac{Kilómetros\ recorridos\ al\ año}{Rendimiento\ promedio\ (km/L)}$

_Ejemplo:_

**Litros consumidos al año** = $\frac{120.000\ km/año}{10\ km/L}$ = $12.000\ L/año$

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir la cantidad** y la fuente de emisión

Debes rellenar los siguientes campos:

| Campo           | Qué debes ingresar                                                                                                                                |                                                 Ejemplo |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------: |
| Tipo (Opcional) | Qué vehículo o maquinaria vas a declarar. Si no está en la lista, selecciona **Otro**: este campo es descriptivo y no cambia el factor de emisión |        Camión, Excavadora, Grúa horquilla (montacargas) |
| Combustible     | Combustible utilizado por tu(s) vehículo(s)                                                                                                       | Diésel, gasolina, GLP, gas natural, electricidad (BEVs) |
| Unidad          | Unidad en la que se declara el combustible                                                                                                        |                                                  Litros |
| Cantidad        | Total anual consumido por la flota                                                                                                                |                                                12.000 L |

⚠️ No siempre hay factor para todos los combustibles y unidades disponibles

⚠️ El campo **"Fuente factor" no debes modificarlo**

⚠️ Si el combustible de tu vehículo o maquinaria no está en la lista, selecciona **Otro** y declara tu propio factor de emisión en **"Fuente factor" → "Otro"**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Debes rellenar los campos igual que en el Caso 1.

2.- Luego, en el campo **"Fuente factor"**, debes seleccionar **"Otro"**.

3.- Debes modificar el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado.

---

**CASO 3:** Hiciste el cálculo por fuera y **ya tienes las emisiones totales de la subcategoría**

Debes ingresar a la calculadora en **modo experto**.  
Luego, en el paso 3, debes seleccionar el checkbox **"Sólo quiero ingresar el total de emisiones"**, lo que habilitará el recuadro para ingresar las **emisiones totales de la sub-categoría**.

---

### 📌 Ejemplo práctico

Supongamos que durante el año tu empresa consumió:

- **12.000 litros de diésel**

Y el factor de emisión del diésel es (ejemplo referencial):

- **Por cada litro consumido de diésel, tu empresa emite 2,68 kg CO₂e**

Entonces el cálculo sería:

> $CO₂e$ = $12.000\ L \times 2,68\ kg\ CO₂e/L$ = $32.160\ kg\ CO₂e$

Es decir, tu flota habría generado:

- **32.160 kg CO₂e en el año**
- O lo mismo que **32,16 toneladas de CO₂e**

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en **kg CO₂e por litro**, la cantidad debe estar en **litros**.

---

## 📝 Notas importantes

> - Incluye solo **vehículos propios o controlados directamente**
> - Traslados realizados por **empresas externas** se reportan en **Transporte tercerizado (Alcance 3)**
> - **Vehículos eléctricos (BEVs)** cargados en sede propia se contabilizan en **Electricidad (Alcance 2)**; si se cargan externamente con pago de la empresa, se declaran aquí con combustible **"Electricidad"** (Alcance 1)
> - Guarda **facturas y planillas** como respaldo para auditorías o certificaciones
$md$::text AS "content")
UPDATE "subcategory" s
SET "explanation" = guide."content"
FROM guide, "category" c
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE s."category_id" = c."id"
  AND c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial' AND co."iso_code" = 'PD'
  AND s."name" = 'Combustiones móviles (flota propia)' AND s."status" <> 'DELETED'
  AND s."explanation" IS DISTINCT FROM guide."content";

-- Emisiones fugitivas
WITH guide AS (SELECT $md$# 🧪 Emisiones fugitivas

Esta categoría corresponde a **emisiones no intencionales que se liberan por fugas o escapes de gases**, como **pérdidas de gases refrigerantes** en **aires acondicionados**, **cámaras de frío**, **sistemas de refrigeración**, **gases industriales** u **otras fugas provenientes de procesos o equipos presurizados**.

Estas emisiones suelen ser **invisibles**, pero pueden tener un **alto impacto climático**, especialmente cuando involucran **gases refrigerantes** como HFC, HCFC u otros gases industriales.

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Has hecho **mantención a tus equipos de aire acondicionado o refrigeración** durante el año?
- ¿Tu empresa utiliza **cámaras de frío, refrigeradores industriales o sistemas HVAC**?
- ¿Han existido **fugas de gases** en tus instalaciones?
- ¿Tu empresa maneja o transporta **gases industriales o refrigerantes**?
- ¿Tienes **facturas, boletas o reportes técnicos** de recarga de gas o mantenciones?

💡 **Tip importante:**
Si **no utilizas gases refrigerantes**, **no tienes equipos de refrigeración**, **nunca has realizado mantenciones ni recargas de gas** o no sabes de este concepto, es probable que **no tengas emisiones fugitivas relevantes**.

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, entonces tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

---

## ¿Cómo es el cálculo de emisiones?

El cálculo de emisiones corresponde a la multiplicación de un **factor de emisión por la cantidad de gas liberado**.  
Cada gas tiene un **potencial de calentamiento global (GWP)** distinto, por lo que el impacto varía según el tipo de gas.

> $CO₂e$ = $Cantidad\ de\ gas\ liberado \times Factor\ de\ emisión$

💡 **Al final de la página hay un ejemplo ilustrativo**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica las emisiones provenientes de fuentes fugitivas

Incluye emisiones asociadas a:

- Mantenciones o recargas de equipos de aire acondicionado
- Mantenciones a cámaras de frío o sistemas de refrigeración
- Fugas de gas detectadas en equipos industriales
- Fugas en el traslado o manipulación de gas
- Reemplazo de refrigerantes en sistemas HVAC o similares

⚠️ Solo debes incluir **emisiones de equipos o procesos controlados por tu empresa**

---

### 2️⃣ Recolecta la información de las cantidades liberadas

Puedes obtener los datos desde:

- **Facturas o boletas** de la empresa que realiza la mantención
- **Reportes técnicos** de servicios de refrigeración
- **Contratos o registros de recarga de gas**
- **Contacto directo con la empresa de mantención**
- **Registros internos de mantenimiento**

⚠️ Si no tienes el dato exacto, puedes **hacer estimaciones razonables y declarar los supuestos utilizados**

---

### 3️⃣ Si no tienes el dato exacto, aquí hay aproximaciones útiles

#### **Opción 1:** Usar la cantidad de gas recargado en mantenciones

Si una empresa realizó una mantención y recargó gas:

> **Cantidad de gas liberado** ≈ **Cantidad de gas recargado**

_Ejemplo:_  
Si se recargaron **5 kg de HFC-32**, puedes declarar **5 kg** como gas liberado.

---

#### **Opción 2:** Estimar fugas según frecuencia de mantención

Si sabes que tus equipos requieren **recargas periódicas**, puedes estimar la cantidad total anual sumando todas las recargas realizadas durante el año.

> **Gas total anual** = Cantidad de gas recargado por recarga $\times$ cantidad de recargas anuales

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir la cantidad** y el tipo de gas

Debes rellenar los siguientes campos:

| Campo    | Qué debes ingresar                 |                Ejemplo |
| :------- | :--------------------------------- | ---------------------: |
| Gas      | Tipo de gas liberado               | HFC-32, R-134a, R-404A |
| Unidad   | Unidad en la que se declara el gas |                     kg |
| Cantidad | Total anual de gas liberado        |                   5 kg |

⚠️ Asegúrate de seleccionar correctamente el **tipo de gas**, ya que cada uno tiene un impacto climático distinto

⚠️ Para conocer el tipo de gas liberado, puedes consultar a tu servicio de mantención, revisar la etiqueta del equipo o buscar el modelo en internet

⚠️ El campo **"Fuente factor" no debes modificarlo**

⚠️ Si el gas que liberaste no está en la lista, selecciona **Otro** y declara tu propio factor de emisión en **"Fuente factor" → "Otro"**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Debes rellenar los campos igual que en el Caso 1.

2.- Luego, en el campo **"Fuente factor"**, debes seleccionar **"Otro"**.

3.- Debes modificar el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado.

---

**CASO 3:** Hiciste el cálculo por fuera y **ya tienes las emisiones totales de la subcategoría**

Debes ingresar a la calculadora en **modo experto**.  
Luego, en el paso 3, debes seleccionar el checkbox **"Sólo quiero ingresar el total de emisiones"**, lo que habilitará el recuadro para ingresar las **emisiones totales de la sub-categoría**.

---

### 📌 Ejemplo práctico

Supongamos que durante el año tu empresa recargó:

- **5 kg de HFC-32**

Y el potencial de calentamiento global (GWP) del HFC-32 es (ejemplo referencial):

- **Por cada kg utilizado de HFC-32, se generan 677 kg CO₂e**

Entonces el cálculo sería:

> $CO₂e$ = $5\ kg \times 677\ kg\ CO₂e/kg$ = $3.385\ kg\ CO₂e$

Es decir, la recarga habría generado:

- **3.385 kg CO₂e en el año**
- O lo mismo que **3,385 toneladas de CO₂e**

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en **kg CO₂e por kg de gas**, la cantidad debe estar en **kg**.

---

## 📝 Notas importantes

> - Si **no sabes qué son las emisiones fugitivas**, probablemente **tu empresa no genera este tipo de emisiones**
> - Las emisiones fugitivas son **de las más contaminantes**, debido al **alto potencial de calentamiento global (GWP)** de los gases refrigerantes
> - Incluye solo **fugas reales o recargas realizadas durante el período evaluado**
> - Guarda **facturas, reportes técnicos o contratos** como respaldo para auditorías o certificaciones
> - Mejorar la **mantención preventiva** puede reducir significativamente este tipo de emisiones
$md$::text AS "content")
UPDATE "subcategory" s
SET "explanation" = guide."content"
FROM guide, "category" c
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE s."category_id" = c."id"
  AND c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial' AND co."iso_code" = 'PD'
  AND s."name" = 'Emisiones fugitivas' AND s."status" <> 'DELETED'
  AND s."explanation" IS DISTINCT FROM guide."content";

-- Emisiones por uso de suelo - Agricultura
WITH guide AS (SELECT $md$# 🌱 Emisiones por uso de suelo — Agricultura

Esta categoría incluye las **emisiones asociadas a actividades agrícolas y manejo del suelo**, tales como **laboreo**, **cultivo de suelos** y **manejo agronómico**.

Corresponde a emisiones generadas por el **cultivo con fines agrícolas**, incluyendo **plantaciones de frutas, verduras, cereales u otros cultivos**, bajo control operativo de la empresa.

Estas emisiones pueden estar asociadas a la liberación de **óxido nitroso (N₂O)** y otros gases derivados del **manejo del suelo y descomposiciones**, los cuales tienen un **impacto relevante en el cambio climático**.

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa cultiva suelos con fines agrícolas?
- ¿Tienes plantaciones de frutas, verduras, cereales u otros cultivos?
- ¿Realizas labores de preparación o manejo del suelo?
- ¿Administras directamente terrenos productivos?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, entonces tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

---

## ¿Cómo es el cálculo de emisiones?

El cálculo de emisiones corresponde a la multiplicación de un **factor de emisión por la superficie cultivada**.  
El factor depende del **tipo de cultivo y zona climática**.

> $CO₂e$ = $Superficie\ cultivada \times Factor\ de\ emisión$

💡 **Al final de la página hay un ejemplo ilustrativo**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica las actividades agrícolas bajo tu control

Incluye:

- **Cultivos de frutas**
- **Cultivos de hortalizas y verduras**
- **Cultivos de cereales**
- **Plantaciones agrícolas en general**
- Superficies agrícolas en **clima templado o tropical**

⚠️ Solo debes incluir **superficies bajo control o administración directa de tu empresa**

---

### 2️⃣ Recolecta la información necesaria

Debes identificar:

- **Tipo de cultivo**
- **Superficie cultivada durante el año**
- **Zona climática (si aplica)**

Puedes obtener esta información desde:

- Registros agrícolas internos
- Planes de manejo predial
- Declaraciones agrícolas
- Inventarios de superficie sembrada
- Sistemas de mapas satelitales (Google Maps)

⚠️ Si la superficie varía durante el año, puedes declarar **la mayor cantidad que se tuvo durante el año**

---

### 3️⃣ Si no tienes el dato exacto en hectáreas

#### **Opción 1:** Cuando conoces la superficie en metros cuadrados

> **Hectáreas (ha)** = $\frac{Metros\ cuadrados}{10.000}$

_Ejemplo:_

Si tu empresa cultiva **250.000 m²**:

**Hectáreas cultivadas** = $\frac{250.000}{10.000}$ = **25 ha**

---

#### **Opción 2:** Cuando conoces la cantidad de predios y su tamaño promedio

> **Superficie total** = $Cantidad\ de\ predios \times Tamaño\ promedio$

_Ejemplo:_  
Si tienes **3 predios** de **15 ha cada uno**:

**Hectáreas cultivadas** = $3 \times 15$ = **45 ha cultivadas**

---

### 4️⃣ Ingreso de la información

Debes completar los siguientes campos:

| Campo           | Qué debes ingresar         |                                        Ejemplo |
| :-------------- | :------------------------- | ---------------------------------------------: |
| Tipo de cultivo | Categoría del cultivo      | General clima templado, General clima tropical |
| Unidad          | Unidad declarada           |                                             ha |
| Cantidad        | Superficie cultivada anual |                                          40 ha |

⚠️ Selecciona correctamente el **tipo de cultivo**, ya que el factor de emisión varía según categoría y zona climática

⚠️ El campo **"Fuente factor"** no debe modificarse salvo que utilices un **factor propio**

⚠️ Si tu tipo de cultivo no está en la lista, selecciona **Otro** y declara tu propio factor de emisión en **"Fuente factor" → "Otro"**

---

### 📌 Ejemplo práctico

Supongamos que durante el año tu empresa cultivó:

- **40 hectáreas (ha) de cultivos en clima templado**

Y el factor de emisión es (ejemplo referencial):

- **Por cada hectárea cultivada en clima templado, se generan 2.000 kg CO₂e al año**

Entonces el cálculo sería:

> $CO₂e$ = $40\ ha \times 2.000\ kg\ CO₂e/ha$ = $80.000\ kg\ CO₂e$

Es decir, la actividad agrícola habría generado:

- **80.000 kg CO₂e en el año**
- O lo mismo que **80,00 toneladas de CO₂e**

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en **kg CO₂e por hectárea**, la cantidad debe estar en **hectáreas (ha)**.

---

## 📝 Notas importantes

> - Incluye solo **superficies agrícolas bajo control directo**
> - No incluyas actividades ganaderas (eso corresponde a **Ganadería**)
> - Guarda **registros prediales y productivos** como respaldo ante auditorías o certificaciones
> - Mejorar prácticas agrícolas puede reducir emisiones asociadas al suelo, como el buen manejo del agua
$md$::text AS "content")
UPDATE "subcategory" s
SET "explanation" = guide."content"
FROM guide, "category" c
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE s."category_id" = c."id"
  AND c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial' AND co."iso_code" = 'PD'
  AND s."name" = 'Emisiones por uso de suelo - Agricultura' AND s."status" <> 'DELETED'
  AND s."explanation" IS DISTINCT FROM guide."content";

-- Emisiones por uso de suelo - Ganadería
WITH guide AS (SELECT $md$# 🐄 Emisiones por uso de suelo — Ganadería

Esta categoría corresponde a **emisiones generadas por actividades ganaderas**, incluyendo las emisiones provenientes de la **digestión de los animales (fermentación entérica)** y el **manejo de estiércol**.  
Aplica para empresas o actividades que mantengan **animales de pastoreo, producción, crianza o trabajo**.

Estas emisiones son relevantes debido a la liberación de **metano (CH₄)** y **óxido nitroso (N₂O)**, gases con un **alto impacto climático**.

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tienes **animales de pastoreo** (vacas, ovejas, cabras u otros)?
- ¿Tienes **animales de lechería**?
- ¿Realizas **crianza o engorda de animales**?
- ¿Tu empresa utiliza **animales para transporte de carga o trabajo**?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, entonces tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**

---

## ¿Cómo es el cálculo de emisiones?

El cálculo de emisiones se basa en la multiplicación de un **factor de emisión por la cantidad de animales**.  
El **factor de ganadería ya incluye** tanto:

- Las emisiones por la **digestión de los animales**
- Las emisiones por el **manejo del estiércol**

> $CO₂e$ = $Cantidad\ de\ animales \times Factor\ de\ emisión$

⚠️ El factor varía según el **tipo de animal**, ya que cada especie genera emisiones distintas.

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica las emisiones provenientes de actividades ganaderas

Incluye animales utilizados para:

- **Producción de carne** (bovinos, porcinos, aves, ovinos, caprinos)
- **Producción de leche**
- **Cría o engorda**
- **Pastoreo**
- **Trabajo o transporte** (caballos, mulas, burros)

⚠️ Solo debes incluir **animales bajo control o propiedad directa de tu empresa**

---

### 2️⃣ Recolecta la información necesaria

Debes identificar:

- **Tipo de animal**
- **Cantidad promedio de animales durante el año**

Puedes obtener esta información desde:

- Registros productivos internos
- Inventarios ganaderos
- Reportes de producción
- Declaraciones sanitarias o agrícolas

⚠️ Si la cantidad varía durante el año, puedes declarar un **promedio anual**.

---

### 3️⃣ Si no tienes el número exacto, aquí hay aproximaciones útiles

#### **Opción 1:** Promedio anual de animales

Si el número de animales cambia durante el año:

> **Cantidad promedio anual** = $\frac{Animales\ al\ inicio + Animales\ al\ final}{2}$

_Ejemplo:_

**Animales a declarar** = $\frac{80 + 100}{2}$ = **90 animales promedio**

---

### 4️⃣ Ingreso de la información

Debes rellenar los siguientes campos:

| Campo          | Qué debes ingresar                          |           Ejemplo |
| :------------- | :------------------------------------------ | ----------------: |
| Tipo de animal | Selecciona el tipo de animal desde la lista | Vacas de pastoreo |
| Cantidad       | Número promedio anual de animales           |                90 |

Las opciones disponibles de tipo de animal son: **Vacas de pastoreo**, **Vacas lecheras**, **Ovejas**, **Porcinos**, **Búfalos**, **Cabras**, **Caballos**, **Mulas y burros**, **Camélidos**, **Ciervos**, **Crianza de aves** y **Otro**.

⚠️ Si tu tipo de animal no está en la lista, selecciona **Otro** y declara tu propio factor de emisión en **"Fuente factor" → "Otro"**

⚠️ Selecciona correctamente el **tipo de animal**, ya que los factores de emisión varían entre especies

---

### 📌 Ejemplo práctico

Supongamos que durante el año tu empresa tuvo en promedio:

- **120 Vacas de pastoreo**

Y el factor de emisión para Vacas de pastoreo (ejemplo referencial) es:

- **Por cada vaca de pastoreo que tienes en tu campo, se generan 1.500 kg CO₂e al año**

Entonces el cálculo sería:

> $CO₂e$ = $120\ Vacas\ de\ pastoreo \times 1.500\ kg\ CO₂e/animal$ = $180.000\ kg\ CO₂e$

Es decir, la actividad ganadera habría generado:

- **180.000 kg CO₂e en el año**
- O lo mismo que **180 toneladas de CO₂e**

⚠️ Es importante que el factor de emisión esté expresado en **kg CO₂e por animal por año**, y que la cantidad declarada corresponda al **promedio anual de animales**.

---

## 📝 Notas importantes

> - Si **no tienes animales**, probablemente **no tienes emisiones ganaderas**
> - Las emisiones ganaderas incluyen **digestión y manejo de estiércol**
> - La ganadería es una fuente relevante de **metano (CH₄)**, un gas altamente contaminante
> - Usa un **promedio anual** si el número de animales varía durante el año
> - Guarda **registros productivos o inventarios** como respaldo para auditorías o certificaciones
> - Mejorar la **alimentación, manejo y eficiencia productiva** puede reducir estas emisiones
$md$::text AS "content")
UPDATE "subcategory" s
SET "explanation" = guide."content"
FROM guide, "category" c
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE s."category_id" = c."id"
  AND c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial' AND co."iso_code" = 'PD'
  AND s."name" = 'Emisiones por uso de suelo - Ganadería' AND s."status" <> 'DELETED'
  AND s."explanation" IS DISTINCT FROM guide."content";

-- Procesos industriales - Cemento
WITH guide AS (SELECT $md$# 🏭 Procesos industriales – Cemento

Esta categoría corresponde a **las emisiones generadas en la fabricación de cemento**, específicamente aquellas derivadas del **proceso químico de descarbonatación del clinker**.

Está pensada exclusivamente para **empresas productoras de cemento** que fabrican clinker o lo utilizan para producir cemento.

Aquí se reportan las emisiones que **provienen del proceso químico del clinker**, no del consumo de combustible ni electricidad.

⚠️ No debes incluir aquí:

- Combustión de hornos → se reporta en **Combustiones estacionarias**
- Consumo eléctrico → se reporta en **Electricidad (Alcance 2)**
- Transporte de materias primas → se reporta en la categoría correspondiente

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa produce cemento?
- ¿Fabricas clinker en hornos rotatorios?
- ¿Compras clinker para producir cemento?
- ¿Tienes registros de toneladas de clinker producidas o utilizadas?
- ¿Tu proceso incluye la descarbonatación de carbonato de calcio (CaCO₃)?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, entonces tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

---

## ¿Cómo es el cálculo de emisiones?

Las emisiones del cemento provienen principalmente de la **descomposición química del carbonato de calcio durante la producción de clinker**.

El cálculo se basa en la **cantidad de clinker utilizado** multiplicado por un **factor de emisión específico**.

> $CO₂e$ = $Cantidad\ de\ clinker \times Factor\ de\ emisión$

💡 Para calcular correctamente, solo necesitas saber la **cantidad total anual de clinker producido o utilizado**.

💡 **Al final de la página hay un ejemplo ilustrativo**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica el material utilizado

Actualmente, el único material que debes declarar es: **Clinker**

⚠️ Si produces cemento con clinker propio o comprado, debes declarar el total utilizado en el año.

---

### 2️⃣ Recolecta la información de clinker anual

Debes identificar la **cantidad total de clinker producido o utilizado durante el año**.

Puedes obtener esta información desde:

- Reportes de producción de planta
- Balances de masa
- Informes operacionales
- Declaraciones ambientales regulatorias
- Registros de consumo de materias primas
- ERP o sistemas internos de producción

⚠️ La cantidad debe corresponder al **total anual**, no capacidad instalada.

---

### 3️⃣ Si no tienes el total anual consolidado

#### **Opción 1:** Sumar producción mensual de clinker

Si tienes reportes mensuales:

> **Clinker anual** = Suma de producción mensual de los 12 meses

_Ejemplo:_

Si produces en promedio **80.000 toneladas mensuales de clinker**:

**Toneladas de clinker anuales** = $80.000 \times 12$ = **960.000 toneladas/año**

---

#### **Opción 2:** Estimar desde el cemento producido y factor de clinker

Si conoces la producción total de cemento y el porcentaje de clinker en la mezcla:

> **Clinker utilizado** = $Cemento\ producido \times contenido\ de\ clinker$

_Ejemplo:_

- Producción anual de cemento: **1.200.000 toneladas**
- Contenido promedio de clinker: **75%**

**Toneladas de clinker anuales** = $1.200.000 \times 0,75$ = **900.000 toneladas de clinker**

⚠️ Declara los supuestos utilizados si aplicas esta aproximación.

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir la cantidad anual**

Debes rellenar los siguientes campos:

| Campo    | Qué debes ingresar                |   Ejemplo |
| :------- | :-------------------------------- | --------: |
| Material | Material utilizado en el proceso  |   Clinker |
| Unidad   | Unidad declarada                  | Toneladas |
| Cantidad | Total anual utilizado o producido | 900.000 t |

⚠️ El campo **"Fuente factor" no debes modificarlo**

⚠️ Si el material que utilizas no está en la lista, selecciona **Otro** y declara tu propio factor de emisión en **"Fuente factor" → "Otro"**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Debes rellenar los campos igual que en el Caso 1.

2.- Luego, en el campo **"Fuente factor"**, debes seleccionar **"Otro"**.

3.- Debes modificar el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado.

---

**CASO 3:** Ya tienes las emisiones totales calculadas externamente

Debes ingresar a la calculadora en **modo experto**.  
Luego, en el paso 3, debes seleccionar el checkbox **"Sólo quiero ingresar el total de emisiones"**, lo que habilitará el recuadro para ingresar las **emisiones totales del proceso**.

---

### 📌 Ejemplo práctico

Supongamos que durante el año tu empresa utilizó:

- **900.000 toneladas de clinker**

Y el factor de emisión del clinker es (ejemplo referencial):

- **0,52 t CO₂e por tonelada de clinker**

Entonces el cálculo sería:

> $CO₂e$ = $900.000\ t \times 0,52\ t\ CO₂e/t$ = $468.000\ t\ CO₂e$

Es decir, el proceso productivo habría generado:

- **468.000 toneladas de CO₂e en el año**

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en **t CO₂e por tonelada**, la cantidad debe estar en **toneladas**.

---

## 📝 Notas importantes

> - Esta categoría aplica solo a **empresas productoras de cemento**
> - Solo debes declarar emisiones asociadas al **clinker**
> - No incluyas combustibles ni electricidad aquí
> - Guarda reportes productivos y balances de masa como respaldo para auditorías o verificaciones externas
$md$::text AS "content")
UPDATE "subcategory" s
SET "explanation" = guide."content"
FROM guide, "category" c
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE s."category_id" = c."id"
  AND c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial' AND co."iso_code" = 'PD'
  AND s."name" = 'Procesos industriales - Cemento' AND s."status" <> 'DELETED'
  AND s."explanation" IS DISTINCT FROM guide."content";

-- Procesos industriales - Vidrio
WITH guide AS (SELECT $md$# 🏭 Procesos industriales – Vidrio

Esta categoría corresponde a **las emisiones generadas en la producción de vidrio nuevo**, considerando únicamente el vidrio fabricado a partir de **materias primas vírgenes**.

Aquí se reportan las emisiones derivadas del **proceso industrial de fusión y transformación de materias primas para fabricar vidrio**.

⚠️ Solo debes considerar el **vidrio nuevo producido**, es decir, debes descontar el vidrio reciclado (calcín) utilizado en el proceso.

⚠️ No debes incluir aquí:

- Combustión de hornos → se reporta en **Combustiones estacionarias**
- Consumo eléctrico → se reporta en **Electricidad (Alcance 2)**

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa fabrica vidrio a partir de materias primas?
- ¿Operas hornos de fusión de vidrio?
- ¿Tienes registros de toneladas de vidrio producido durante el año?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, entonces tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

💡 **Tip importante:**  
Debes declarar únicamente el **vidrio nuevo producido**, descontando el porcentaje de vidrio reciclado utilizado en el proceso.

---

## ¿Cómo es el cálculo de emisiones?

Las emisiones se calculan en base a la **cantidad de vidrio nuevo producido**, multiplicado por el **factor de emisión correspondiente al tipo de vidrio**.

Primero debes descontar el vidrio reciclado:

> **Vidrio nuevo producido** = $Vidrio\ total\ producido \times (1 - \% \ vidrio\ reciclado)$

Luego:

> $CO₂e$ = $Vidrio\ nuevo\ producido \times Factor\ de\ emisión$

💡 Es fundamental que el porcentaje de vidrio reciclado esté expresado en formato decimal (ejemplo: 30% = 0,30).

💡 **Al final de la página hay un ejemplo ilustrativo**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica el tipo de vidrio producido

Debes seleccionar el tipo de vidrio que represente el **mayor porcentaje en la composición del vidrio producido**:

- Contenedores (Recipientes de color transparente)
- Contenedores de color (Recipientes de color verde u otros)
- Fibra de vidrio (E-glass)
- Fibra de vidrio (lana de aislación)
- Vidrio de iluminación (Ampolletas, bombillas, etc)
- Vidrio general
- Vidrio plano (ventanas, mesas, etc)
- Vidrios de vajilla (Vasos, copas, platos, etc)

⚠️ Si produces distintos tipos en proporciones relevantes, debes declararlos por separado.

💡 **Fibra de vidrio:** la fibra de refuerzo (E-glass) y la lana de aislación tienen factores distintos —190 y 250 kg CO₂e por tonelada— porque usan mezclas de materias primas diferentes. Elige la que corresponda a tu producto.

💡 **Vidrio general** es el factor genérico, pensado para cuando no puedes distinguir el tipo de vidrio producido. Si conoces el tipo, el factor específico es más preciso.

---

### 2️⃣ Recolecta la información de producción anual

Debes identificar:

- Cantidad total anual de vidrio producido
- Porcentaje promedio anual de vidrio reciclado utilizado

Puedes obtener esta información desde:

- Reportes de producción
- Registros de consumo de materias primas
- Informes operacionales
- Sistemas ERP o registros internos

⚠️ La cantidad debe corresponder al **total anual producido**, no capacidad instalada.

---

### 3️⃣ Si no tienes el total anual de vidrio nuevo calculado

#### **Opción 1:** Descontar el porcentaje de vidrio reciclado

Si conoces la producción total y el porcentaje de vidrio reciclado:

> **Vidrio nuevo producido** = $Vidrio\ total \times (1 - \% \ vidrio\ reciclado)$

_Ejemplo:_

- Producción total anual: **100.000 toneladas**
- Vidrio reciclado utilizado: **30%**

**Vidrio nuevo producido anualmente** = $100.000 \times (1 - 0,30)$ = **70.000 toneladas de vidrio nuevo**

---

#### **Opción 2:** Si no conoces el porcentaje de reciclado

Si no cuentas con el porcentaje exacto, puedes:

- Consultar al área de producción
- Revisar especificaciones técnicas del horno
- Utilizar el promedio anual informado en reportes internos

⚠️ Declara los supuestos utilizados si aplicas una estimación.

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir la cantidad anual**

Debes rellenar los siguientes campos:

| Campo          | Qué debes ingresar                         |                             Ejemplo |
| :------------- | :----------------------------------------- | ----------------------------------: |
| Tipo de vidrio | Tipo con mayor proporción en la producción | Vidrio plano (ventanas, mesas, etc) |
| Unidad         | Unidad declarada                           |                           Toneladas |
| Cantidad       | Total anual de vidrio nuevo producido      |                            70.000 t |

⚠️ El campo **"Fuente factor" no debes modificarlo**

⚠️ Si tu tipo de vidrio no está en la lista, selecciona **Otro** y declara tu propio factor de emisión en **"Fuente factor" → "Otro"**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Debes rellenar los campos igual que en el Caso 1.

2.- Luego, en el campo **"Fuente factor"**, debes seleccionar **"Otro"**.

3.- Debes modificar el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado (recuerda ingresar el factor en **kilogramos** de CO₂e por unidad).

---

**CASO 3:** Ya tienes las emisiones totales calculadas externamente

Debes ingresar a la calculadora en **modo experto**.  
Luego, en el paso 3, debes seleccionar el checkbox **"Sólo quiero ingresar el total de emisiones"**, lo que habilitará el recuadro para ingresar las **emisiones totales del proceso**.

---

### 📌 Ejemplo práctico

Supongamos que durante el año tu empresa produjo:

- **100.000 toneladas de vidrio total**
- Con un **30% de vidrio reciclado**

Primero calculamos el vidrio nuevo:

> **Vidrio nuevo producido** = $100.000 \times (1 - 0,30)$ = **70.000 t**

El factor del vidrio plano es:

- **210 kg CO₂e por tonelada de vidrio nuevo** (equivalente a 0,21 t CO₂e/t)

Entonces:

> $CO₂e$ = $70.000\ t \times 210\ kg\ CO₂e/t$ = $14.700.000\ kg\ CO₂e$ → **14.700 t CO₂e**

Es decir, el proceso productivo habría generado:

- **14.700 toneladas de CO₂e en el año**

⚠️ Es importante que las **unidades coincidan**.
El campo "Factor kgCO₂e/unidad" espera el factor en **kilogramos** de CO₂e por unidad. Si tu fuente expresa el factor en toneladas, multiplícalo por 1.000 para convertirlo a kg.

---

## 📝 Notas importantes

> - Solo debes declarar **vidrio nuevo producido**
> - Descuenta siempre el porcentaje de vidrio reciclado utilizado
> - No incluyas combustibles ni electricidad aquí
> - Guarda reportes productivos como respaldo para auditorías o verificaciones externas
$md$::text AS "content")
UPDATE "subcategory" s
SET "explanation" = guide."content"
FROM guide, "category" c
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE s."category_id" = c."id"
  AND c."name" = 'Emisiones directas' AND mv."name" = 'Metodología inicial' AND co."iso_code" = 'PD'
  AND s."name" = 'Procesos industriales - Vidrio' AND s."status" <> 'DELETED'
  AND s."explanation" IS DISTINCT FROM guide."content";

-- Desplazamiento diario de empleados
WITH guide AS (SELECT $md$# 🚌 Desplazamiento diario de empleados

Esta sub-categoría incluye las emisiones asociadas al **traslado cotidiano de los empleados entre su hogar y el lugar de trabajo (commuting)**.

Cubre todos los modos de transporte que usan los empleados, con desglose de **Tipo** y, cuando aplica, **Combustible**:

- 🚗 **Auto** (Gasolina, Diésel, Eléctrico, Híbrido)
- 🏍️ **Moto** (Gasolina, Eléctrico)
- 🚌 **Bus urbano** / **Bus interurbano**
- 🚇 **Metro**
- 🚂 **Tren cercanías** / **Tren larga distancia**
- 🚕 **Taxi / Ride-share** (Gasolina, Eléctrico, Híbrido)
- 🚲 **Bici** (factor 0)
- 🚶 **Caminata** (factor 0)

> Para modos que no se desglosan por combustible (Bus, Metro, Tren, Bici, Caminata), usa la variante **"No aplica"**.

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa **tiene empleados** que se desplazan a una oficina, planta o local?
- ¿Tus empleados usan **auto, moto, bus, metro, tren, taxi/ride-share, bici o caminata** para llegar al trabajo?
- ¿Conoces o puedes estimar la **distancia recorrida en el año** por tus empleados en cada modo?
- ¿Cubres algún **acercamiento corporativo o viático de transporte**?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

> Para empresas de **servicios** (consultoras, estudios, software), el commuting suele ser una de las fuentes más significativas del Alcance 3.

---

## ¿Cómo es el cálculo de emisiones?

La plataforma trabaja con **cantidades agregadas a nivel organización**, no por empleado individual. Para cada combinación de **Tipo × Combustible** usada por tu equipo, suma el total anual de km y se multiplica por el factor correspondiente:

> $CO_2e$ = $Distancia\ anual\ agregada\ (km) \times Factor\ por\ Tipo\ y\ Combustible\ (kg\ CO_2e/km)$

Factores referenciales (DEFRA 2025):

| Tipo                 | Combustible | Factor (kg CO₂e/km) |
| :------------------- | :---------- | ------------------: |
| Auto                 | Gasolina    |               0.173 |
| Auto                 | Diésel      |               0.166 |
| Auto                 | Eléctrico   |               0.047 |
| Auto                 | Híbrido     |               0.110 |
| Moto                 | Gasolina    |               0.114 |
| Moto                 | Eléctrico   |               0.030 |
| Bus urbano           | No aplica   |               0.117 |
| Bus interurbano      | No aplica   |               0.027 |
| Metro                | No aplica   |               0.041 |
| Tren cercanías       | No aplica   |               0.035 |
| Tren larga distancia | No aplica   |               0.035 |
| Taxi/Ride-share      | Gasolina    |               0.149 |
| Taxi/Ride-share      | Eléctrico   |               0.060 |
| Taxi/Ride-share      | Híbrido     |               0.110 |
| Bici                 | No aplica   |               0.000 |
| Caminata             | No aplica   |               0.000 |

💡 **Al final de la página hay un ejemplo ilustrativo.**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica tu fuerza laboral

- Total de empleados
- Modalidad: presencial / híbrido / 100% remoto
- Días presenciales por semana (en híbridos)
- Días al año efectivamente trabajados (descontando vacaciones, feriados, licencias)

---

### 2️⃣ Recolecta los datos de transporte

La fuente más confiable es una **encuesta interna** anual. Pregunta a cada empleado:

- ¿Cómo te trasladas habitualmente al trabajo?
- ¿Cuántos km hay (ida y vuelta) entre tu casa y el trabajo?
- ¿Cuántos días a la semana asistes presencialmente?
- Si usa auto/moto/taxi: ¿qué combustible o variante?

⚠️ Si la encuesta tiene baja tasa de respuesta, extrapola con los datos disponibles y declara el supuesto.

---

### 3️⃣ Si no tienes encuesta o datos detallados

#### **Opción 1:** Estimación por ubicación de residencia

Si conoces la comuna, distrito, municipio o código postal de cada empleado, puedes estimar la distancia hasta la oficina con Google Maps o herramientas geo.

---

#### **Opción 2:** Promedios nacionales o de la ciudad

La distancia promedio al trabajo en grandes ciudades de la región suele estar en **8-15 km** (ida). El **mix de modos** varía mucho por ciudad — busca estadísticas locales si están disponibles. Si no, aplica una mezcla razonable:

> Ejemplo (gran ciudad de la región): 40-60% transporte público, 30-50% auto/moto, 5-10% otros (a pie, bici)

---

### 4️⃣ Ingreso de la información

Por cada combinación de **Tipo × Combustible** que aplique a tu equipo, agrega una línea con:

| Campo       | Qué debes ingresar                             |       Ejemplo |
| :---------- | :--------------------------------------------- | ------------: |
| Tipo        | Modo de transporte                             |          Auto |
| Combustible | Combustible o variante (o "No aplica")         |      Gasolina |
| Unidad      | km                                             |            km |
| Cantidad    | Total anual agregado de la flota laboral en km | 72.000 km/año |

⚠️ El campo **"Fuente factor" no debes modificarlo**, salvo que uses factores propios.

⚠️ Si el medio de transporte que usan tus empleados no está en la lista, selecciona **Otro** y declara tu propio factor de emisión en **"Fuente factor" → "Otro"**

---

### 📌 Ejemplo práctico

Supongamos una **consultora de 15 empleados** en modalidad híbrida (3 días presencial):

- Distancia promedio ida y vuelta: 22 km
- Días presenciales/año: 3 días/semana × 44 semanas = 132 días
- Modo: 70% auto gasolina, 30% bus urbano

> Auto/Gasolina: $15 \times 0,7 \times 22\ km \times 132\ días \times 0,173\ kg/km$ ≈ **5.276 kg CO₂e**
>
> Bus urbano/No aplica: $15 \times 0,3 \times 22\ km \times 132\ días \times 0,117\ kg/km$ ≈ **1.530 kg CO₂e**
>
> **Total commuting: ~6.806 kg CO₂e**

⚠️ Es importante que las **unidades coincidan**: el factor está en kg CO₂e/km, la cantidad debe estar en km.

---

## 📝 Notas importantes

> - **Diferencia con Alcance 1:** si el empleado se mueve en un **vehículo corporativo**, eso es Alcance 1 (combustión móvil), no commuting. Solo cuenta acá si usa **medios propios o de terceros**.
> - **Diferencia con Viajes de negocios:** commuting es el desplazamiento **cotidiano casa-trabajo**. Los viajes laborales puntuales (a otra ciudad, a un cliente, etc.) van en **Viajes de negocios — Traslado**.
> - **Trabajo remoto:** las emisiones del teletrabajo se reportan en la sub-categoría **"Trabajo remoto de empleados"**, no aquí.
> - **Bici y caminata:** factor 0, pero igual incluye los empleados en la encuesta para entender la distribución.
> - **Acercamiento corporativo:** si tu empresa contrata buses para llevar empleados, esas emisiones también van aquí (o en Alcance 1 si es flota propia).
> - Guarda los **resultados de la encuesta** y la metodología como respaldo.
$md$::text AS "content")
UPDATE "subcategory" s
SET "explanation" = guide."content"
FROM guide, "category" c
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE s."category_id" = c."id"
  AND c."name" = 'Otras emisiones indirectas' AND mv."name" = 'Metodología inicial' AND co."iso_code" = 'PD'
  AND s."name" = 'Desplazamiento diario de empleados' AND s."status" <> 'DELETED'
  AND s."explanation" IS DISTINCT FROM guide."content";

-- Disposición de residuos sólidos
WITH guide AS (SELECT $md$# 🗑️ Disposición de residuos sólidos

Esta categoría corresponde a **las emisiones generadas por el tratamiento y disposición final de los residuos sólidos producidos por tu empresa**.

Incluye las emisiones asociadas a residuos enviados a:

- **Rellenos sanitarios**
- **Incineración**
- **Reciclaje**

Cada tipo de tratamiento genera **diferentes niveles de emisiones**, por lo que es importante **identificar correctamente el destino de los residuos**.

💡 **Reciclar generalmente genera menos emisiones** que enviar residuos a relleno sanitario o incineración.

⚠️ Aquí debes incluir **todos los residuos sólidos generados por tu empresa**, tales como:

- residuos de oficinas
- embalajes
- residuos industriales
- residuos de construcción
- aparatos electrónicos
- materiales reciclables

---

## 📘 ¿Preguntas que te pueden ayudar a identificar esta información?

- ¿Tu empresa genera **basura o residuos durante sus operaciones**?
- ¿Tienes **retiro de basura por parte de un gestor o municipalidad**?
- ¿Separan residuos para **reciclaje** (papel, plástico, vidrio, metal)?
- ¿Se generan **residuos electrónicos o equipos en desuso**?
- ¿Existen **residuos de construcción, mantenimiento o remodelaciones**?

Si tu empresa **genera cualquier tipo de residuo sólido**, debes declararlo en esta subcategoría.

---

## ¿Cómo es el cálculo de emisiones?

Las emisiones se estiman multiplicando la **cantidad de residuos generados** por un **factor de emisión asociado al material y al tipo de disposición final**.

> $CO₂e$ = $Cantidad\ de\ residuos \times Factor\ de\ emisión$

💡 Para calcular correctamente solo necesitas conocer:

- **Tipo de material**
- **Destino del residuo**
- **Cantidad anual generada**

💡 **Al final de la página hay ejemplos para ayudarte a estimar la cantidad generada.**

---

# 🧭 Paso a paso para completar la información

## 1️⃣ Identificar el tipo de material

Debes identificar **el tipo de residuo que estás declarando**.

Los materiales disponibles son:

- Materiales de construcción
- Items electrónicos
- Metal
- Madera
- Papel
- Plástico
- Vidrio

⚠️ Debes crear **un registro separado por cada material y destino**.

---

## 2️⃣ Identificar el destino del residuo

Debes indicar **qué ocurre con ese residuo**.

Los destinos posibles son:

- **Relleno sanitario**
- **Incineración**
- **Reciclaje**

⚠️ No todos los materiales tienen factores disponibles para todos los destinos.

Si la plataforma no permite una combinación específica, deberás seleccionar **la alternativa disponible más cercana**.

---

## 3️⃣ Estimar la cantidad anual de residuos

Muchas empresas **no registran el peso exacto de sus residuos**.  
Si este es tu caso, puedes **realizar estimaciones simples**.

### Opción 1: Estimar desde bolsas de basura generadas

Puedes pesar **una bolsa de basura promedio** y estimar cuántas se generan semanalmente.

> **Residuos anuales estimados** = $Peso\ bolsa \times Bolsas\ por\ semana \times 52$

Ejemplo:

- Peso promedio de una bolsa: **5 kg**
- Bolsas generadas por semana: **20**

$5 \times 20 \times 52 = 5.200\ kg/año$

---

### Opción 2: Estimar residuos electrónicos

Si tu empresa desecha **equipos electrónicos**, puedes buscar su **peso aproximado en internet**.

Ejemplo:

- Peso promedio de un computador: **8 kg**
- Computadores desechados en el año: **15**

$8 \times 15 = 120\ kg/año$

---

### Opción 3: Estimar residuos por número de trabajadores

Existen estimaciones de **residuos generados por persona**.

Una aproximación común en oficinas es aproximadamente:

- **1 kg de residuos por persona por día laboral**

Ejemplo:

- 30 trabajadores
- 240 días laborales al año

$30 \times 1 \times 240 = 7.200\ kg/año$

---

### Opción 4: Estimar desde retiros de basura

Si un gestor o municipalidad **retira contenedores o bins de basura**, puedes estimar:

- Capacidad del contenedor
- Frecuencia de retiro

Ejemplo:

- Contenedor de **240 kg**
- Retiro **2 veces por semana**

$240 \times 2 \times 52 = 24.960\ kg/año$

---

## 4️⃣ Ingreso de la información

### **Caso 1: Eres novato y solo quieres introducir la cantidad**

Debes rellenar los siguientes campos:

| Campo    | Qué debes ingresar                |   Ejemplo |
| :------- | :-------------------------------- | --------: |
| Material | Tipo de residuo generado          |     Papel |
| Destino  | Tipo de tratamiento o disposición | Reciclaje |
| Unidad   | Unidad declarada                  |        kg |
| Cantidad | Total anual generado              |     5.200 |

⚠️ El campo **"Fuente factor" no debes modificarlo**.

⚠️ Si el material de tu residuo no está en la lista, selecciona **Otro** y declara tu propio factor de emisión en **"Fuente factor" → "Otro"**

---

### **Caso 2: Eres experto y utilizas factores propios**

1.- Debes rellenar los campos igual que en el Caso 1.

2.- Luego, en el campo **"Fuente factor"**, debes seleccionar **"Otro"**.

3.- Debes modificar el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado.

---

### **Caso 3: Ya tienes las emisiones calculadas externamente**

Debes ingresar a la calculadora en **modo experto**.

Luego, en el paso 3, debes seleccionar el checkbox:

**"Sólo quiero ingresar el total de emisiones"**

Esto habilitará el campo para ingresar **las emisiones totales de la subcategoría**.

---

## 📌 Ejemplo práctico

Supongamos que una empresa genera en el año:

- **5.200 kg de residuos de papel**
- Destino: **Reciclaje**

El cálculo sería:

> $CO₂e$ = $5.200\ kg \times Factor\ de\ emisión$

La plataforma calculará automáticamente las emisiones utilizando el factor correspondiente.

---

## 📝 Notas importantes

> - Debes declarar **todos los residuos sólidos generados por tu empresa**
> - Incluye residuos de oficinas, procesos productivos, mantenimiento y equipos en desuso
> - Si **reciclas residuos**, las emisiones suelen ser **menores**
> - Puedes estimar la cantidad utilizando **bolsas de basura, número de trabajadores o peso de equipos**
> - Si no tienes mediciones exactas, **una estimación razonable es suficiente**
> - Guarda registros o supuestos utilizados como respaldo para auditorías
$md$::text AS "content")
UPDATE "subcategory" s
SET "explanation" = guide."content"
FROM guide, "category" c
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE s."category_id" = c."id"
  AND c."name" = 'Otras emisiones indirectas' AND mv."name" = 'Metodología inicial' AND co."iso_code" = 'PD'
  AND s."name" = 'Disposición de residuos sólidos' AND s."status" <> 'DELETED'
  AND s."explanation" IS DISTINCT FROM guide."content";

-- Productos comprados
WITH guide AS (SELECT $md$# 📦 Productos comprados

Esta sub-categoría incluye las emisiones **embebidas (embodied)** en todo lo que tu empresa **compra para operar**: corresponden a las emisiones que **se generaron para producir** los bienes y servicios que tu empresa adquiere — desde la extracción de materias primas hasta la entrega al proveedor (cradle-to-gate).

Cubre tanto **bienes** como **servicios**:

- 🧱 Materias primas para tu producción (acero, cemento, telas, plástico, alimentos)
- 📄 Insumos de oficina (papel, toner, artículos de aseo)
- 💻 Equipos comprados (computadores, impresoras, mobiliario, maquinaria)
- 🛠️ Servicios contratados (consultoría, IT, limpieza, seguridad, marketing)
- 💧 Agua potable comprada a la sanitaria
- 📦 Embalajes y materiales de empaque

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa **compra materias primas o insumos** productivos?
- ¿Adquieres **equipos, herramientas, mobiliario o maquinaria**?
- ¿**Contratas servicios** profesionales o tercerizados (consultoría, IT, limpieza, seguridad)?
- ¿**Pagas cuenta de agua** potable o servicios sanitarios?
- ¿Compras **embalajes o materiales de empaque**?
- ¿Tienes registros de **órdenes de compra, facturas o libro mayor de gastos**?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

> Para **empresas industriales o manufactureras**, esta suele ser la sub-categoría **más grande** del Alcance 3, dominada por las materias primas.

---

## ¿Cómo es el cálculo de emisiones?

Existen tres enfoques según la calidad del dato:

**1) Por actividad física (más preciso):**

> $CO₂e$ = $Cantidad\ comprada \times Factor\ por\ unidad$

**2) Por gasto (estimación):**

> $CO₂e$ = $Gasto\ anual \times Factor\ EEIO\ sectorial$

**3) Por proveedor (más preciso aún):**

Si el proveedor te entrega su huella de carbono certificada por unidad (EPD), usa ese dato.

| Categoría               | Unidad           | Factor referencial                     |
| :---------------------- | :--------------- | :------------------------------------- |
| Acero                   | kg               | 1,9 kg CO₂e/kg                         |
| Aluminio                | kg               | 8,2 kg CO₂e/kg                         |
| Papel                   | kg               | 1,1 kg CO₂e/kg                         |
| Plástico (PET)          | kg               | 2,5 kg CO₂e/kg                         |
| Cemento                 | kg               | 0,9 kg CO₂e/kg                         |
| Agua potable            | m³               | 0,3 kg CO₂e/m³                         |
| Servicios profesionales | unidad monetaria | factor EEIO sectorial (varía por país) |

💡 **Al final de la página hay un ejemplo ilustrativo.**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica tus categorías de compra significativas

Aplica el **principio de Pareto** (80/20): empieza por las compras que representan el mayor volumen o gasto.

- Revisa tu libro mayor o ERP por categoría
- Lista los **top 10 proveedores** o tipos de insumo
- Identifica las categorías que en conjunto suman ~80% de tu gasto en compras

⚠️ No intentes mapear cada compra individual al inicio. Empieza por lo más material.

---

### 2️⃣ Recolecta los datos por categoría

Para cada categoría material:

- **Cantidad física** (preferido): kg, ton, unidades, m³
- **Gasto anual** (alternativa): en tu moneda local

Fuentes de datos:

- ERP, sistema de compras
- Libro mayor / contabilidad
- Órdenes de compra
- Facturas de proveedores
- Inventario de bodega

⚠️ Si un proveedor te entrega su **declaración ambiental de producto (EPD)**, úsala — son los mejores datos.

---

### 3️⃣ Si no tienes el dato exacto

#### **Opción 1:** Estimación por gasto (factor EEIO)

Cuando solo tienes el monto pagado en una categoría:

> $CO₂e$ = $Monto\ gastado \times Factor\ EEIO\ por\ unidad\ monetaria$

⚠️ Los **factores EEIO dependen del país** (cada economía tiene su propia tabla insumo-producto). Verifica que el factor esté calibrado en la **misma moneda** en la que estás declarando el gasto.

_Ejemplo:_ Si tu empresa gastó **30.000.000 unidades de moneda local** en consultoría y el factor sectorial EEIO local es **0,02 kg CO₂e/unidad monetaria**:

**Emisiones** = $30.000.000 \times 0,02$ = **600.000 kg CO₂e**

---

#### **Opción 2:** Promedios del rubro

Para insumos de oficina o consumibles, usa promedios típicos por empleado o por unidad de producción.

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir la cantidad**

Debes rellenar los siguientes campos:

| Campo                 | Qué debes ingresar |                                 Ejemplo |
| :-------------------- | :----------------- | --------------------------------------: |
| Categoría de producto | Tipo general       | Acero, Papel, Plástico, Servicios, Agua |
| Sub-tipo              | Detalle si aplica  |       Acero inoxidable, papel reciclado |
| Unidad                | Unidad declarada   |               kg, ton, m³, moneda local |
| Cantidad              | Total anual        |                       12.000 kg, 500 m³ |

⚠️ El campo **"Fuente factor" no debes modificarlo**

⚠️ Si el material que compraste no está en la lista, selecciona **Otro** y declara tu propio factor de emisión en **"Fuente factor" → "Otro"**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Rellena los campos igual que en el Caso 1.

2.- En el campo **"Fuente factor"**, selecciona **"Otro"**.

3.- Modifica el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado (ej. EPD del proveedor).

---

**CASO 3:** Hiciste el cálculo por fuera y **ya tienes las emisiones totales de la sub-categoría**

Accede a la calculadora en **modo experto**. En el paso 3, selecciona el checkbox **"Sólo quiero ingresar el total de emisiones"**.

---

### 📌 Ejemplo práctico

Supongamos una **imprenta** que durante el año compra:

- **12.000 kg de papel offset** — Factor 1,1 kg CO₂e/kg
- **800 kg de tinta** — Factor 4,5 kg CO₂e/kg
- **300 m³ de agua potable** — Factor 0,3 kg CO₂e/m³

Cálculo:

| Insumo |  Cantidad | Factor |      Emisiones |
| :----- | --------: | -----: | -------------: |
| Papel  | 12.000 kg |    1,1 | 13.200 kg CO₂e |
| Tinta  |    800 kg |    4,5 |  3.600 kg CO₂e |
| Agua   |    300 m³ |    0,3 |     90 kg CO₂e |

**Total: 16.890 kg CO₂e al año (~16,9 ton CO₂e)**

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en kg CO₂e/kg, la cantidad debe estar en kg.

---

## 📝 Notas importantes

> - **Empieza por lo material.** Es preferible reportar bien las top 5 categorías que reportar mal todo
> - **Datos primarios > datos genéricos.** Si un proveedor te da su huella certificada (EPD), úsala — es mucho más precisa que un factor genérico
> - **Servicios también cuentan.** Aunque parezca contraintuitivo, contratar consultoría, limpieza o IT genera emisiones indirectas
> - **No dupliques con transporte upstream.** El factor de "productos comprados" cubre la producción del bien hasta la puerta del proveedor. El **transporte desde el proveedor hasta tu empresa** se reporta en _Transporte y distribución aguas arriba_
> - **No dupliques con uso de productos vendidos.** Si tu producto incluye partes que compraste, los insumos van aquí, pero el uso final del producto vendido va en otra sub-categoría
> - **Equipos de capital (capital goods):** algunas metodologías los separan como sub-categoría aparte. La plataforma puede agruparlos aquí — verifica al ingresar
> - **Documenta supuestos** y guarda **órdenes de compra, facturas y EPDs** como respaldo
$md$::text AS "content")
UPDATE "subcategory" s
SET "explanation" = guide."content"
FROM guide, "category" c
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE s."category_id" = c."id"
  AND c."name" = 'Otras emisiones indirectas' AND mv."name" = 'Metodología inicial' AND co."iso_code" = 'PD'
  AND s."name" = 'Productos comprados' AND s."status" <> 'DELETED'
  AND s."explanation" IS DISTINCT FROM guide."content";

-- Transporte y distribución de bienes aguas abajo
WITH guide AS (SELECT $md$# 🚚 Transporte y distribución de bienes aguas abajo

Esta sub-categoría incluye las emisiones asociadas al **traslado y distribución de productos terminados** desde tu empresa hasta el cliente final, realizado por **terceros** (couriers, empresas de logística).

Cubre toda la logística que ocurre **después** de que tu producto sale de tus instalaciones, cuando el transporte lo realiza una empresa externa:

- 📦 **Couriers y empresas de paquetería** (locales y globales)
- 🚛 **Transportistas y empresas de logística** contratadas
- 🛒 **Despacho a domicilio** (last mile)
- 🏪 **Envío a tiendas o retailers** que después distribuyen
- 🏬 **Almacenamiento intermedio** en bodegas de terceros (3PL)
- ✈️ **Transporte aéreo o marítimo** de exportación

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tu empresa **despacha productos** a clientes (B2B o B2C)?
- ¿Usas **couriers o empresas de logística** para distribuir?
- ¿Tienes **registros de envíos** (cantidad, peso, distancia, costos)?
- ¿Vendes a través de **retailers** que después distribuyen al consumidor final?
- ¿**Exportas productos** vía aérea o marítima?
- ¿Operas **bodegas de terceros (3PL)** como punto intermedio?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

⚠️ Si el transporte se hace con tu **flota propia** (camiones, camionetas de tu empresa), eso va en **Alcance 1 — Combustiones móviles**, NO aquí.

---

## ¿Cómo es el cálculo de emisiones?

El cálculo combina peso, distancia y modo de transporte:

> $CO₂e$ = $Peso\ transportado \times Distancia \times Factor\ por\ modo$

(unidad estándar: **ton-km**)

| Modo de transporte        | Factor referencial           |
| :------------------------ | :--------------------------- |
| Camión liviano (<3,5 ton) | 0,25 kg CO₂e/ton-km          |
| Camión pesado (>16 ton)   | 0,07 kg CO₂e/ton-km          |
| Tren de carga             | 0,03 kg CO₂e/ton-km          |
| Marítimo (carga general)  | 0,015 kg CO₂e/ton-km         |
| Aéreo (carga)             | 0,6 kg CO₂e/ton-km           |
| Refrigerado (cold chain)  | +30-50% sobre el factor base |

💡 **Al final de la página hay un ejemplo ilustrativo.**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica los modos de despacho

Lista todos los canales por los que tu empresa entrega productos:

- Couriers contratados
- Empresas de logística (transportistas)
- Despacho a domicilio
- Envíos a retailers
- Exportaciones

⚠️ Si tienes **flota propia**, sepáralo: esa parte va en Alcance 1.

---

### 2️⃣ Recolecta los datos

Las fuentes principales:

- **Reportes del proveedor logístico:** algunos couriers entregan reportes de envíos con peso y distancia
- **ERP / sistema de despachos:** datos de cada envío
- **Órdenes de compra a logística:** facturas y planillas de proveedores
- **Datos contables:** gasto anual en logística

Datos mínimos a recolectar:

- **Peso total transportado** (kg o ton)
- **Distancia promedio** o ton-km totales
- **Modo de transporte** (terrestre, aéreo, marítimo)

---

### 3️⃣ Si no tienes el dato exacto

#### **Opción 1:** Estimación por peso y distancia promedio

> $ton{\text -}km\ totales$ = $N°\ envíos \times peso\ promedio \times distancia\ promedio$

_Ejemplo:_ 5.000 envíos/año × 3 kg promedio × 100 km = 1.500.000 kg-km = **1.500 ton-km**

---

#### **Opción 2:** Estimación por gasto en logística

Si solo tienes el monto pagado:

> $CO₂e$ = $Gasto\ en\ logística \times Factor\ sectorial$

---

#### **Opción 3:** Pedir reporte al proveedor

Couriers grandes (DHL, FedEx, UPS, entre otros) pueden entregar reporte de huella anual de tu cuenta.

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir las cantidades**

Debes rellenar los siguientes campos:

| Campo              | Qué debes ingresar |                                    Ejemplo |
| :----------------- | :----------------- | -----------------------------------------: |
| Modo de transporte | Tipo de transporte |                 Terrestre, Aéreo, Marítimo |
| Sub-modo           | Detalle            | Camión liviano, Camión pesado, Carga aérea |
| Unidad             | Unidad declarada   |                   ton-km, km, moneda local |
| Cantidad           | Total anual        |                               1.500 ton-km |

⚠️ El campo **"Fuente factor" no debes modificarlo**

⚠️ Si el transporte utilizado no está en la lista, selecciona **Otro** y declara tu propio factor de emisión en **"Fuente factor" → "Otro"**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Rellena los campos igual que en el Caso 1.

2.- En el campo **"Fuente factor"**, selecciona **"Otro"**.

3.- Modifica el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado (ej. factor del proveedor logístico).

---

**CASO 3:** Hiciste el cálculo por fuera y **ya tienes las emisiones totales de la sub-categoría**

Accede a la calculadora en **modo experto**. En el paso 3, selecciona el checkbox **"Sólo quiero ingresar el total de emisiones"**.

---

### 📌 Ejemplo práctico

Supongamos una **fábrica de alimentos** que despacha durante el año:

- **800 toneladas** de productos terminados
- Distancia promedio al cliente: **200 km** (terrestre, camión pesado)

> $CO₂e$ = $800\ ton \times 200\ km \times 0,07\ kg\ CO₂e/ton{\text -}km$ = $11.200\ kg\ CO₂e$

Adicionalmente exporta **15 toneladas** vía aérea a un mercado regional (~2.500 km):

> $CO₂e\ aéreo$ = $15 \times 2.500 \times 0,6$ = $22.500\ kg\ CO₂e$

**Total sub-categoría: ~33.700 kg CO₂e al año (33,7 ton CO₂e)**

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en kg CO₂e/ton-km, la cantidad debe estar en ton-km.

---

## 📝 Notas importantes

> - **Diferencia clave con Alcance 1:** si transportas con **flota propia o leasing operativo**, eso va en Alcance 1 (combustiones móviles), no aquí
> - **Diferencia con upstream:** acá se reporta lo que **sale** de tu empresa hacia el cliente. Lo que **entra** desde proveedores se reporta en _Transporte y distribución aguas arriba_
> - **Productos refrigerados** tienen factor mayor (cold chain) por consumo del equipo de refrigeración del transporte
> - **Aéreo es ~10x más intensivo** que terrestre por ton-km. Reducir aéreo es la mayor palanca de mitigación
> - **Si vendes FOB (Free On Board):** técnicamente el cliente asume el transporte. Aún así, reportarlo voluntariamente da visibilidad de la huella total de tu cadena
> - **Last mile (entrega a domicilio):** suele ser intensivo por uso de camionetas pequeñas — ojo si tienes mucho B2C
> - Guarda **reportes de los proveedores logísticos**, **facturas** y **planillas internas** como respaldo
$md$::text AS "content")
UPDATE "subcategory" s
SET "explanation" = guide."content"
FROM guide, "category" c
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE s."category_id" = c."id"
  AND c."name" = 'Otras emisiones indirectas' AND mv."name" = 'Metodología inicial' AND co."iso_code" = 'PD'
  AND s."name" = 'Transporte y distribución de bienes aguas abajo' AND s."status" <> 'DELETED'
  AND s."explanation" IS DISTINCT FROM guide."content";

-- Transporte y distribución de bienes aguas arriba
WITH guide AS (SELECT $md$# 🚛 Transporte y distribución de bienes aguas arriba

Esta sub-categoría incluye las emisiones asociadas al **traslado y distribución de materias primas, productos comprados e insumos** desde tus proveedores hasta las instalaciones de tu empresa, cuando el transporte lo realiza un tercero (proveedor o transportista contratado).

Cubre toda la logística que ocurre **antes** de que los insumos lleguen a tu empresa:

- 🚛 **Camiones de proveedores** que despachan a tu bodega
- ✈️ **Importaciones aéreas** de insumos
- 🚢 **Importaciones marítimas** (contenedores)
- 📦 **Couriers entrantes** (paquetería, equipos comprados)
- 🏬 **Transporte entre bodega del proveedor y la tuya**
- 🚂 **Transporte ferroviario** de carga (donde aplique)

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tus proveedores te **despachan materias primas o insumos**?
- ¿**Importas mercaderías** desde otros países?
- ¿Conoces el **origen geográfico** de tus principales insumos?
- ¿Sabes qué **modo de transporte** usan tus proveedores (camión, avión, barco)?
- ¿Tienes **registros de fletes pagados** o documentos de embarque (BL, AWB)?
- ¿Compras **CIF o FOB** (incoterms)?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

⚠️ Si el transporte se hace con tu **flota propia**, eso va en **Alcance 1 — Combustiones móviles**, no aquí.

---

## ¿Cómo es el cálculo de emisiones?

Misma lógica que el transporte downstream:

> $CO₂e$ = $Peso\ transportado \times Distancia \times Factor\ por\ modo$

(unidad estándar: **ton-km**)

| Modo de transporte          | Factor referencial           |
| :-------------------------- | :--------------------------- |
| Camión liviano (<3,5 ton)   | 0,25 kg CO₂e/ton-km          |
| Camión pesado (>16 ton)     | 0,07 kg CO₂e/ton-km          |
| Tren de carga               | 0,03 kg CO₂e/ton-km          |
| Marítimo (contenedores)     | 0,015 kg CO₂e/ton-km         |
| Aéreo (carga internacional) | 0,5 kg CO₂e/ton-km           |
| Refrigerado (cold chain)    | +30-50% sobre el factor base |

💡 El **modo aéreo** es por lejos el más intensivo: ~30x más que marítimo.

💡 **Al final de la página hay un ejemplo ilustrativo.**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica el origen de tus insumos principales

Para los insumos que más representan en tu operación:

- ¿De dónde vienen geográficamente?
- ¿Quién los transporta? (proveedor o transportista contratado por ti)
- ¿En qué modo? (terrestre, aéreo, marítimo)

⚠️ Aplica el principio de Pareto: empieza por los **top insumos en peso o gasto**.

---

### 2️⃣ Recolecta los datos

Las fuentes principales:

- **Documentos de embarque:**
  - Bill of Lading (BL) para marítimo
  - Air Waybill (AWB) para aéreo
  - Carta de Porte para terrestre
- **Facturas de flete** (si tu empresa lo paga directamente)
- **Datos del proveedor** (algunos lo informan en sus DDJJ ambientales)
- **ERP / sistema de compras** (peso de mercadería recibida)

Datos mínimos:

- **Peso total recibido** (kg o ton) por origen
- **Distancia** desde el origen (geo-distancia o real)
- **Modo** de transporte

---

### 3️⃣ Si no tienes el dato exacto

#### **Opción 1:** Distancia geográfica entre origen y destino

Usa Google Maps o calculadora de rutas marítimas/aéreas para estimar la distancia.

_Ejemplo:_ Insumo importado desde Asia hasta un puerto sudamericano = **~19.000 km marítimo**.

---

#### **Opción 2:** Estimación por modo asumido

Si compras a un proveedor en otra ciudad del mismo país (ej. distancia ~500 km), puedes estimar:

> 1 envío × peso × ~500 km × factor camión pesado

---

#### **Opción 3:** Si compras CIF

Si tu incoterm es CIF (Cost, Insurance, Freight), el flete está incluido en el precio del proveedor — el proveedor a veces puede entregar el detalle.

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir las cantidades**

Debes rellenar los siguientes campos:

| Campo              | Qué debes ingresar |                                     Ejemplo |
| :----------------- | :----------------- | ------------------------------------------: |
| Modo de transporte | Tipo de transporte |            Terrestre, Aéreo, Marítimo, Tren |
| Sub-modo           | Detalle            | Camión liviano, Carga marítima, Carga aérea |
| Unidad             | Unidad declarada   |                               ton-km, kg-km |
| Cantidad           | Total anual        |                              190.000 ton-km |

⚠️ El campo **"Fuente factor" no debes modificarlo**

⚠️ Si el transporte utilizado no está en la lista, selecciona **Otro** y declara tu propio factor de emisión en **"Fuente factor" → "Otro"**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Rellena los campos igual que en el Caso 1.

2.- En el campo **"Fuente factor"**, selecciona **"Otro"**.

3.- Modifica el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado.

---

**CASO 3:** Hiciste el cálculo por fuera y **ya tienes las emisiones totales de la sub-categoría**

Accede a la calculadora en **modo experto**. En el paso 3, selecciona el checkbox **"Sólo quiero ingresar el total de emisiones"**.

---

### 📌 Ejemplo práctico

Supongamos un **taller textil** que durante el año recibe:

- **10 toneladas de tela** importada desde Asia — vía marítima — distancia 19.000 km
- **2 toneladas de hilados** desde un país vecino (vía terrestre, camión pesado) — distancia 1.400 km
- **200 kg de equipos** importados — vía aérea — distancia 7.000 km

Cálculo:

| Origen        | Modo      |    Peso | Distancia |  ton-km | Factor |     Emisiones |
| :------------ | :-------- | ------: | --------: | ------: | -----: | ------------: |
| Asia          | Marítimo  |  10 ton | 19.000 km | 190.000 |  0,015 | 2.850 kg CO₂e |
| País vecino   | Terrestre |   2 ton |  1.400 km |   2.800 |   0,07 |   196 kg CO₂e |
| Internacional | Aéreo     | 0,2 ton |  7.000 km |   1.400 |    0,5 |   700 kg CO₂e |

**Total sub-categoría: ~3.746 kg CO₂e al año (~3,7 ton CO₂e)**

> ⚠️ Los 200 kg aéreos generan casi tanto como las 10 toneladas marítimas. Para este negocio, **reducir importaciones aéreas** es la mayor palanca.

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en kg CO₂e/ton-km, la cantidad debe estar en ton-km.

---

## 📝 Notas importantes

> - **Diferencia clave con Alcance 1:** si transportas insumos con **flota propia**, eso es Alcance 1, no aquí
> - **Diferencia con downstream:** acá entran insumos. Los productos que **salen** de tu empresa hacia clientes van en _Transporte y distribución aguas abajo_
> - **No dupliques con productos comprados:** el factor de "productos comprados" cubre la producción **hasta la puerta del proveedor**. El transporte desde ahí hasta tu empresa va aquí
> - **Aéreo:** factor ~30x mayor que marítimo. Para insumos pesados o volumétricos, conviene marítimo cuando es posible
> - **Cold chain:** insumos refrigerados (alimentos, biotecnología, fármacos) tienen factor mayor
> - **Incoterms:** define con tu proveedor quién paga el flete y de dónde a dónde — ayuda a delimitar lo que reportas
> - **Si compras a un proveedor local pero el insumo viene importado**, idealmente reporta **toda** la cadena de transporte (importación + último tramo)
> - Guarda **BL, AWB, cartas de porte y facturas de flete** como respaldo
$md$::text AS "content")
UPDATE "subcategory" s
SET "explanation" = guide."content"
FROM guide, "category" c
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE s."category_id" = c."id"
  AND c."name" = 'Otras emisiones indirectas' AND mv."name" = 'Metodología inicial' AND co."iso_code" = 'PD'
  AND s."name" = 'Transporte y distribución de bienes aguas arriba' AND s."status" <> 'DELETED'
  AND s."explanation" IS DISTINCT FROM guide."content";

-- Viajes de negocios - Traslado
WITH guide AS (SELECT $md$# ✈️ Viajes de negocios — Traslado

Esta sub-categoría incluye todo el **transporte asociado a viajes laborales** de empleados, distinto del desplazamiento diario casa-trabajo: vuelos, buses, trenes, taxis, vehículos arrendados u otros medios utilizados para viajes de negocios.

Cubre:

- ✈️ **Vuelos comerciales** (nacionales e internacionales)
- 🚌 **Buses interurbanos**
- 🚂 **Trenes**
- 🚕 **Taxis y plataformas** (Uber, Cabify, DiDi) en destino
- 🚗 **Vehículos arrendados** (rent-a-car)
- ⛴️ **Ferries o transporte marítimo** (en algunos casos)
- 🛺 **Transportes locales** durante el viaje

---

## 📘 ¿Preguntas claves que te pueden ayudar a determinar si debes declarar emisiones en esta sub-categoría?

- ¿Tus empleados **viajan en avión, bus o tren** por motivos laborales?
- ¿Usan **taxis, Uber o ride-hailing** durante viajes laborales?
- ¿**Arriendan vehículos** durante viajes (rent-a-car)?
- ¿Tienes registros de **tickets, boarding passes o rendiciones de gastos**?
- ¿Tu empresa usa una **plataforma de booking corporativo**?

💡 **Tip importante:**  
Si la respuesta a **una o más de estas preguntas es SÍ**, tu empresa probablemente **debe medir y declarar emisiones en esta sub-categoría**.

> Para empresas que viajan mucho, **el modo aéreo suele dominar** la huella de viajes — y es la mayor palanca de mitigación (videoconferencias, agrupación de viajes).

---

## ¿Cómo es el cálculo de emisiones?

La fórmula general:

> $CO₂e$ = $Distancia \times Factor\ por\ modo \times Ajuste\ por\ clase\ (en\ aéreo)$

| Modo                                  | Factor referencial  |
| :------------------------------------ | :------------------ |
| Vuelo doméstico (corto, <500 km)      | 0,25 kg CO₂e/km/pax |
| Vuelo regional (500-3.700 km)         | 0,15 kg CO₂e/km/pax |
| Vuelo internacional largo (>3.700 km) | 0,11 kg CO₂e/km/pax |
| Bus interurbano                       | 0,03 kg CO₂e/km/pax |
| Tren                                  | 0,04 kg CO₂e/km/pax |
| Taxi / Uber                           | 0,18 kg CO₂e/km     |
| Auto arrendado                        | 0,18 kg CO₂e/km     |

**Ajuste por clase en vuelos:**

- Economy: factor base
- Premium economy: ×1,5
- Business: ×2-3
- First class: ×3-4

💡 Algunos métodos aplican un factor adicional ("radiative forcing index", RFI) de ~1,9x para vuelos por el efecto de las emisiones a altitud — verifica con tu metodología.

💡 **Al final de la página hay un ejemplo ilustrativo.**

---

## 🧭 Paso a paso para completar la información de esta sub-categoría

### 1️⃣ Identifica todos los viajes laborales del año

Lista todos los viajes pagados o autorizados por la empresa:

- Visitas a clientes o proveedores
- Conferencias, ferias, congresos
- Capacitaciones o entrenamientos
- Reuniones interregionales

⚠️ **No incluyas commuting** (eso va en la sub-categoría correspondiente).

---

### 2️⃣ Recolecta los datos

Las fuentes principales:

- **Plataformas de booking corporativo** (entregan reportes con km, modo, clase)
- **Boarding passes / itinerarios** (para vuelos)
- **Rendiciones de gastos** de viajes
- **Tarjetas de crédito corporativas** (si pagan vuelos)
- **Apps de Uber/Cabify** (historial corporativo)

Datos mínimos por viaje:

- **Modo** (avión, bus, tren, taxi, auto arrendado)
- **Origen y destino** (o km recorridos)
- **N° de pasajeros** (normalmente 1, salvo grupo)
- **Clase** (en aéreo)

---

### 3️⃣ Si no tienes el dato exacto

#### **Opción 1:** Distancia geográfica

Si tienes origen y destino pero no los km, calcula con Google Maps o herramientas como [Great Circle Mapper](https://www.gcmap.com/).

---

#### **Opción 2:** Calculadora ICAO

Para vuelos comerciales, usa la **calculadora oficial ICAO** que ajusta por modelo de avión, ocupación y otros factores.

---

#### **Opción 3:** Estimación por gasto

Si solo tienes el monto pagado en pasajes:

> **km estimados** ≈ $\frac{Gasto}{Tarifa\ promedio\ por\ km\ del\ modo}$

---

### 4️⃣ Ingreso de la información

**CASO 1:** Eres **novato y solo quieres introducir las cantidades**

Debes rellenar los siguientes campos:

| Campo             | Qué debes ingresar |                                                               Ejemplo |
| :---------------- | :----------------- | --------------------------------------------------------------------: |
| Modo              | Tipo de transporte | Vuelo doméstico, Vuelo internacional, Bus, Tren, Taxi, Auto arrendado |
| Clase (si aplica) | Clase del vuelo    |                                                     Economy, Business |
| Unidad            | Unidad declarada   |                                                      km, moneda local |
| Cantidad          | Total anual        |                                                             28.000 km |

⚠️ Para vuelos, ingresa una línea por **categoría de distancia** (corto/medio/largo) o por **clase**.

⚠️ El campo **"Fuente factor" no debes modificarlo**

⚠️ Si el transporte que utilizaste no está en la lista, selecciona **Otro** y declara tu propio factor de emisión en **"Fuente factor" → "Otro"**

---

**CASO 2:** Eres **experto y utilizas factores propios** distintos a los de la plataforma

1.- Rellena los campos igual que en el Caso 1.

2.- En el campo **"Fuente factor"**, selecciona **"Otro"**.

3.- Modifica el campo **"Factor kgCO₂e/unidad"** con tu valor personalizado (ej. resultado de calculadora ICAO).

---

**CASO 3:** Hiciste el cálculo por fuera y **ya tienes las emisiones totales de la sub-categoría**

Accede a la calculadora en **modo experto**. En el paso 3, selecciona el checkbox **"Sólo quiero ingresar el total de emisiones"**.

---

### 📌 Ejemplo práctico

Supongamos una **consultora** que durante el año tuvo:

- **4 vuelos domésticos**, ida y vuelta ~1.500 km c/u (Economy)
- **2 vuelos regionales** ida y vuelta ~5.000 km c/u (Economy)
- **1 vuelo internacional** ida y vuelta ~7.000 km (Business)
- **Taxis y ride-hailing en destino**: ~600 km en total (acumulado)
- **Auto arrendado en uno de los viajes**: 800 km

Cálculo:

| Modo                           |     km | Factor | Multiplicador clase |     Emisiones |
| :----------------------------- | -----: | -----: | ------------------: | ------------: |
| Vuelo doméstico (Economy)      |  6.000 |   0,25 |                   1 | 1.500 kg CO₂e |
| Vuelo regional (Economy)       | 10.000 |   0,15 |                   1 | 1.500 kg CO₂e |
| Vuelo internacional (Business) |  7.000 |   0,11 |                 2,5 | 1.925 kg CO₂e |
| Taxi / ride-hailing            |    600 |   0,18 |                   1 |   108 kg CO₂e |
| Auto arrendado                 |    800 |   0,18 |                   1 |   144 kg CO₂e |

**Total: ~5.177 kg CO₂e al año (~5,2 ton CO₂e)**

> ⚠️ El viaje en clase business pesa fuerte por su factor multiplicador (×2,5), a pesar de no ser el más largo en kilometraje. Cambiar de business a economy es una de las mayores palancas de reducción.

⚠️ Es importante que las **unidades coincidan**.  
Si el factor está en kg CO₂e/km, la cantidad debe estar en km.

---

## 📝 Notas importantes

> - **Vuelos cortos tienen factor MAYOR por km** que vuelos largos: el despegue y aterrizaje son las fases más intensivas
> - **Clase de vuelo importa mucho:** business consume 2-3x más por pasajero que economy (más espacio = menos pasajeros por avión)
> - **Radiative forcing index (RFI):** algunos métodos multiplican el factor de vuelos por ~1,9x para reflejar el impacto adicional de emisiones en altitud. Verifica si la plataforma lo aplica
> - **No dupliques con commuting:** commuting es el desplazamiento **diario** casa-trabajo. Esta sub-categoría es para **viajes específicos** por trabajo
> - **No dupliques con Alcance 1:** si la empresa tiene **flota propia** de autos corporativos y los usa en viajes, eso es Alcance 1 (combustión móvil), no aquí
> - **Vehículos arrendados (rent-a-car):** sí van aquí (no es flota propia)
> - **Rideshare de varios pasajeros:** si vas con colegas en el mismo Uber o taxi, divide los km entre los pasajeros para no duplicar
> - **Reducciones efectivas:** videoconferencias en lugar de viajes, agrupación de viajes a una región, viajar en clase economy en vez de business
> - Guarda **boarding passes, itinerarios, recibos y reportes de booking corporativo** como respaldo
$md$::text AS "content")
UPDATE "subcategory" s
SET "explanation" = guide."content"
FROM guide, "category" c
JOIN "methodology_version" mv ON mv."id" = c."methodology_version_id"
JOIN "country" co ON co."id" = mv."country_id"
WHERE s."category_id" = c."id"
  AND c."name" = 'Otras emisiones indirectas' AND mv."name" = 'Metodología inicial' AND co."iso_code" = 'PD'
  AND s."name" = 'Viajes de negocios - Traslado' AND s."status" <> 'DELETED'
  AND s."explanation" IS DISTINCT FROM guide."content";
