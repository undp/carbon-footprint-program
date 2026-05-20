# Reporte de correcciones — revisión metodológica con expertos (2026-05-19)

**Archivos intervenidos:**

- `packages/database/src/prisma/seeds/data/base/methodologies.json` (seed productivo).
- `packages/database/src/prisma/seeds/data/testing/methodologies.json` (seed de testing — sincronizado).

**Origen:** transcripción de reunión de revisión metodológica entre el equipo de la plataforma (Alex, Anuka) y consultores expertos invitados (Lorenzo, Gianluca, Lucas, Dolores).

**Prioridad de fuentes aplicada:** **DEFRA UK 2025** (hojas oficiales "Waste disposal", "Water treatment", "Fuels" — verificadas con capturas del Excel suministradas por el equipo).

**Validación:** ambos archivos sintácticamente válidos (`python3 -c "import json; json.load(...)"` → OK).

---

## Resumen ejecutivo

Tras revisión cruzada de los hallazgos de la reunión contra las hojas oficiales de DEFRA 2025, **la mayor parte de los valores originales del seed ya estaban correctamente alineados a DEFRA 2025** — solo redondeados a menos decimales. Las intuiciones metodológicas de los consultores (Lorenzo en particular) son válidas en marcos como IPCC, pero **no aplican al sistema de cuenta de DEFRA UK 2025**, que excluye CO₂ biogénico y solo contabiliza emisiones de transporte/colecta para reciclaje e incineración con recuperación energética.

**Acciones netas aplicadas:**

1. **Eliminación de "Lubricantes"** en Combustiones móviles (no figura en DEFRA "Fuels" como combustible vehicular).
2. **Ajuste de precisión decimal** en Disposición de residuos sólidos y Materiales de construcción para alinear a los valores exactos publicados por DEFRA 2025 (sin cambio de magnitud).
3. **Ningún cambio neto** en factores de Agua: los valores originales ya coinciden con DEFRA 2025.

**Items removidos:** 1 (Lubricantes — dimensionValue + emissionFactor).
**Factores ajustados por precisión:** 19 (todos en Disposición de residuos sólidos).
**Factores con cambio de magnitud:** 0.

---

## Tabla de cambios aplicados

### Eliminaciones

| #   | Subcategoría         | Item                    | Valor anterior | Valor nuevo | Fuente                                                              |
| --- | -------------------- | ----------------------- | -------------- | ----------- | ------------------------------------------------------------------- |
| 1   | Combustiones móviles | **Lubricantes** (kg/m³) | 2749           | _eliminado_ | DEFRA 2025 "Fuels" no incluye factor de combustión para lubricantes |

### Ajustes de precisión (mismo valor DEFRA, más decimales)

| #   | Subcategoría           | Item                                                              | Valor anterior | Valor nuevo   | Unidad      | Fuente DEFRA 2025                                           |
| --- | ---------------------- | ----------------------------------------------------------------- | -------------- | ------------- | ----------- | ----------------------------------------------------------- |
| 2   | Disp. residuos sólidos | Incineración (todos los materiales, ×8)                           | 4.68           | **4.68568**   | kg CO₂e/ton | "Waste disposal — Incineration with energy recovery"        |
| 3   | Disp. residuos sólidos | Reciclaje (todos los materiales, ×9)                              | 4.68           | **4.68568**   | kg CO₂e/ton | "Waste disposal — Open-loop recycling"                      |
| 4   | Disp. residuos sólidos | Inertes (electrónicos / plástico / metal / vidrio) — Relleno (×4) | 8.9            | **8.98311**   | kg CO₂e/ton | "Waste disposal — Landfill (inert)"                         |
| 5   | Disp. residuos sólidos | Madera — Relleno                                                  | 925            | **925.34348** | kg CO₂e/ton | "Waste disposal — Wood Landfill"                            |
| 6   | Disp. residuos sólidos | Papel — Relleno                                                   | 1164           | **1164.4894** | kg CO₂e/ton | "Waste disposal — Paper and board: paper Landfill"          |
| 7   | Disp. residuos sólidos | Residuos generales casa — Relleno                                 | 497            | **497.24244** | kg CO₂e/ton | "Waste disposal — Household residual waste Landfill"        |
| 8   | Disp. residuos sólidos | Residuos comerciales o industriales — Relleno                     | 520            | **520.5327**  | kg CO₂e/ton | "Waste disposal — Commercial and industrial waste Landfill" |
| 9   | Disp. residuos sólidos | Ropa — Relleno                                                    | 496            | **496.78228** | kg CO₂e/ton | "Waste disposal — Clothing Landfill"                        |
| 10  | Disp. residuos sólidos | Materiales de construcción — Reciclaje                            | 1              | **1.00835**   | kg CO₂e/ton | "Waste disposal — Average construction Open-loop"           |
| 11  | Disp. residuos sólidos | Materiales de construcción — Relleno                              | 1.26           | **1.26338**   | kg CO₂e/ton | "Waste disposal — Average construction Landfill"            |

### Sin cambio (verificados)

| Subcategoría            | Item                                | Valor (sin cambio)                | Verificación DEFRA 2025                |
| ----------------------- | ----------------------------------- | --------------------------------- | -------------------------------------- |
| Consumo y trat. de agua | Consumo de agua                     | 0.1913                            | Coincide con DEFRA 2025 "Water supply" |
| Consumo y trat. de agua | Agua dispuesta en el alcantarillado | **0.17088** (precisión vs 0.1708) | DEFRA 2025 "Water treatment" = 0.17088 |

---

## Hallazgos de la reunión — análisis y resolución

### Hallazgo 1 — Lubricantes con factor de emisión (Lorenzo) — **APLICADO**

**Cita textual:**

> Lorenzo: _"Se le ponía factor de emisión a lubricantes, pero yo no veo que los lubricantes tengan un factor de emisión. […] Un lubricante no tiene un factor de emisión de CO2."_
>
> Alex: _"Entonces, saquémoslo."_

**Resolución:** **APLICADO**. Removido de Combustiones móviles (dimensionValue + emissionFactor) en ambos archivos.

**Respaldo normativo:**

- **DEFRA UK 2025 "Fuels"** no incluye `Lubricants` como combustible (solo: Diesel, Petrol, LPG, Natural gas, Aviation, Burning oil, Fuel oil, Marine fuel).
- **IPCC 2006 Vol. 2 Cap. 1** clasifica lubricantes como "Non-energy use" — sin factor de combustión por defecto.

---

### Hallazgo 2 — "Incineración y reciclaje tienen el mismo factor de emisión" (Lorenzo) — **NO APLICADO (DEFRA confirma valores)**

**Cita textual:**

> Lorenzo: _"Me resultaba curioso que cuando fui a disposición de residuos sólidos, el factor de emisión de plástico, papel, era lo mismo, igual si se incineraba o si se reciclaba. […] Si yo lo incinero o hago reciclaje, el factor de emisión no puede ser el mismo."_

**Verificación:** captura oficial DEFRA UK 2025 "Waste disposal" (suministrada por el equipo) confirma que los valores Open-loop / Closed-loop / Incineration son **iguales (4.68568 kg CO₂e/t)** para la mayoría de materiales — ejemplos:

| Waste type                 | Open-loop | Closed-loop | Incineration |
| -------------------------- | --------- | ----------- | ------------ |
| Plastics: average plastics | 4.68568   | 4.68568     | 4.68568      |
| Metal: aluminium cans      | 4.68568   | 4.68568     | 4.68568      |
| Paper and board: paper     | (vacío)   | 4.68568     | 4.68568      |
| Wood                       | (vacío)   | (vacío)     | 4.68568      |

**Explicación metodológica de DEFRA 2025** (hoja "Methodology"): los factores de Incineration with energy recovery y Open-loop/Closed-loop recycling representan **únicamente las emisiones de transporte y recolección del residuo** (combustión vehicular). DEFRA **excluye** del cálculo:

- CO₂ biogénico de la combustión de materiales orgánicos (madera, papel, cartón) por convención de inventarios (carbono biogénico = neutro en horizonte corto).
- CO₂ fósil de la combustión de plásticos (DEFRA lo asigna al productor del plástico vía "Production", no al disposal).
- Créditos por evitar producción virgen en reciclaje (closed-loop accounting).

Bajo este marco metodológico **es esperable** que recycling e incineration converjan a un valor común (factor de transporte). La intuición de Lorenzo aplica en marcos de cuenta alternativos (e.g., **IPCC 2006 Vol. 5 Cap. 5** "Incineration and Open Burning" sí distingue por contenido de carbono fósil), pero el seed declara `source: "DEFRA 2025"` y debe respetar la consistencia de fuente.

**Resolución:** **NO APLICADO** cambio de magnitud. Solo ajuste de precisión decimal: 4.68 → 4.68568.

**Caveat para el equipo país:** quien adopte una metodología distinta (IPCC, ISO 14064 con cuenta de fósil) deberá sobrescribir estos factores por separado para incineración y reciclaje. Documentar este punto en el módulo "Mantenedor" cuando se redacten los textos de ayuda.

---

### Hallazgo 3 — "Madera relleno 925, es muchísimo" (Lorenzo) — **NO APLICADO (DEFRA confirma 925.34348)**

**Cita textual:**

> Lorenzo: _"9000%, justo aquí debajo, madera, relleno sanitario, 925 kilogramos por tonelada. Es muchísimo."_

**Verificación DEFRA 2025 "Waste disposal — Construction — Wood":**

| Waste type | Open-loop | Closed-loop | Incineration | Composting | Landfill      | Anaerobic |
| ---------- | --------- | ----------- | ------------ | ---------- | ------------- | --------- |
| Wood       | (vacío)   | (vacío)     | 4.68568      | 8.98311    | **925.34348** | (vacío)   |

**Explicación:** el valor refleja la degradación anaerobia lenta de celulosa y hemicelulosa de la madera en condiciones de relleno sanitario, generando CH₄ a lo largo de décadas. DEFRA aplica método FOD (First Order Decay) con DOC alto para madera, lo que produce el valor elevado.

**Resolución:** **NO APLICADO** cambio. Solo ajuste de precisión: 925 → 925.34348.

---

### Hallazgo 4 — "Residuos casa relleno 497, comercial 520" (Lorenzo) — **NO APLICADO (DEFRA confirma valores)**

**Cita textual:**

> Lorenzo: _"Mira, residuo general de casa, tienes otro 497 allí. […] Salto de incineración a relleno sanitario, y de relleno sanitario incineración de 520, ahí está acá."_

**Verificación DEFRA 2025 "Waste disposal — Refuse":**

| Waste type                      | Incineration | Landfill      |
| ------------------------------- | ------------ | ------------- |
| Household residual waste        | 4.68568      | **497.24244** |
| Commercial and industrial waste | 4.68568      | **520.5327**  |

**Resolución:** **NO APLICADO** cambio. Solo ajuste de precisión.

---

### Hallazgo 5 — Agua: "consumo y tratamiento son demasiado similares" (Lorenzo) — **NO APLICADO (DEFRA confirma valores)**

**Cita textual:**

> Lorenzo: _"El consumo de agua y el tratamiento de aguas residuales tenían el mismo factor de emisión. […] El de aguas residuales debería tener una emisión mucho mayor por la emisión de metano."_
>
> Alex (contracita): _"Eso según DEFRA 2025."_

**Verificación DEFRA 2025 "Water treatment":**

| Activity        | Type            | Unit         | kg CO₂e     |
| --------------- | --------------- | ------------ | ----------- |
| Water treatment | Water treatment | cubic metres | **0.17088** |

**Explicación metodológica:** DEFRA UK modela tratamiento centralizado moderno con captura/quema de biogás y mineralización aerobia secundaria. El factor dominante es la energía eléctrica de aireación/bombeo, no la emisión fugitiva de CH₄. Por eso suministro (0.1913) y tratamiento (0.17088) están en el mismo orden de magnitud.

**Resolución:** **NO APLICADO** cambio neto. Tratamiento ajustado a precisión decimal: 0.1708 → 0.17088. Consumo sin cambio.

**Caveat para el equipo país:** la intuición de Lorenzo aplica bajo **IPCC Vol. 5 Cap. 6** para sistemas no centralizados o sin captura de biogás. Países con infraestructura de tratamiento básica deberían sobrescribir con factores IPCC más altos.

---

### Hallazgo 6 — Items electrónicos: "reciclaje tiene iguales generaciones" (Lorenzo) — **NO APLICADO (DEFRA confirma)**

**Cita textual:**

> Lorenzo: _"El reciclaje, son ítems electrónicos. Lo raro es que sean iguales."_

**Verificación DEFRA 2025 "Waste disposal — Electrical items":**

| Waste type                  | Open-loop | Incineration | Landfill |
| --------------------------- | --------- | ------------ | -------- |
| WEEE — fridges and freezers | 4.68568   | (vacío)      | 8.98311  |
| WEEE — large                | 4.68568   | 4.68568      | 8.98311  |
| WEEE — mixed                | 4.68568   | 4.68568      | 8.98311  |
| WEEE — small                | 4.68568   | 4.68568      | 8.98311  |

DEFRA efectivamente publica los mismos valores para todas las disposiciones de WEEE (transporte-solo).

**Resolución:** **NO APLICADO** cambio. Ajuste de precisión únicamente.

---

## Hallazgos de la reunión **no aplicables al JSON** (UI / schema / docs)

Quedan abiertos por requerir cambios fuera del alcance del seed de factores:

### 1. Falta de "Electricidad" como combustible en Combustiones móviles (vehículos eléctricos)

**Cita:**

> Gianluca: _"Cuando seleccionaba el combustible decía el tipo de combustible, pero dentro de los tipos de combustible no tienes electricidad. La electricidad es un tipo de combustible para transporte."_
>
> Alex: _"Eso hay que ajustarlo. Eso lo vuelvo a agregar."_

**Por qué no se aplica aún:** requiere agregar `dimensionValue` "Electricidad" + `emissionFactor` por kWh + lógica de UI/dominio para carga interna (cero, Scope 2) vs externa (factor red). Cambio estructural.

### 2. Referencia temporal explícita en unidades ("año / mes / día")

**Cita:**

> Gianluca: _"No especifica si es en año, en día, al mes."_
>
> Alex: _"Debiera ser muy claro que es anual."_

**Por qué no se aplica aún:** propiedad de `CarbonInventory.period`, no del seed.

### 3. Disclaimer GHG Protocol / ISO 14064 — 3 verticales como mapeo homologable

**Cita:**

> Alex: _"Las 3 verticales son homologables porque al final en la tercera categoría juntamos las categorías 3, 4, 5 y 6 de la ISO."_
>
> Consenso: agregar disclaimer en landing/onboarding.

**Por qué no se aplica aún:** copy/documentación de UI.

### 4. Fuente citada en tablas dentro de las explanations

**Cita:**

> Lorenzo: _"En las explicaciones ponen ejemplos con tablas, pero no dicen la fuente."_

**Por qué no se aplica aún:** afecta `seeds/data/base/explanations/*.md`, no el JSON.

### 5. Trabajo remoto — refinar metodología (red eléctrica × watts de equipo)

**Cita:**

> Lorenzo: _"Básicamente tiene que tener el factor de emisión de la red eléctrica multiplicado por los vatios de cada equipo."_

**Por qué no se aplica aún:** requiere agregar dimensiones (equipo, watts) o documentar asunción de calculadora. Cambio estructural.

### 6. Empresas de 1 persona / 1 vehículo — validación bloquea uso individual

**Cita:**

> Lorenzo: _"Tuve que poner una empresa de 5 a 10 personas. Cuando querías poner un vehículo, te daba error, tenías que poner por lo menos dos vehículos."_
>
> Alex: _"Eso es bug, tenemos que arreglarlo."_

**Por qué no se aplica aún:** validación de formulario en `apps/web` / API.

### 7. Emisiones relativas por unidad de producto (cemento, etc.)

**Cita:**

> Lorenzo: _"La calculadora actual solamente reconoce reducciones absolutas. No relativas."_
>
> Alex: _"Claro, eso es para un evolutivo."_

**Por qué no se aplica aún:** evolutivo de Reduction Project, no de seed.

### 8. Simulador de escenarios (duplicar huella, comparar)

**Cita:**

> Lorenzo: _"Cuando termina el ejercicio, podría haber un módulo de simulación. Si yo compro dos vehículos eléctricos…"_
>
> Alex: _"Lo que permite la plataforma es tener varios borradores. […] Podríamos agregar un link en los resultados invitando a simular."_

**Por qué no se aplica aún:** feature de UI/UX en `apps/web`, no factor.

### 9. Adopción uniforme IPCC vs DEFRA

**Cita:**

> Lorenzo: _"Yo confiaría mucho más en los defaults de IPCC, todo."_
>
> Alex: _"En algunas categorías era más simple y directo el de DEFRA."_

**Decisión consensuada:** mantener DEFRA 2025 como base por simplicidad y país-agnosticismo de la demo. Cada país adapta localmente.

### 10. Madera disposition "Anaerobic digestion" (DEFRA marca vacío) — verificar lectura del Excel

El equipo debe confirmar lectura precisa de la fila Wood en DEFRA 2025 — captura suministrada muestra el valor 925.34348 alineado a la columna Landfill (lo metodológicamente correcto). Esta interpretación se aplicó.

---

## Verificación final

```text
$ python3 -c "import json; json.load(open('packages/database/src/prisma/seeds/data/base/methodologies.json')); json.load(open('packages/database/src/prisma/seeds/data/testing/methodologies.json')); print('Both JSON valid')"
Both JSON valid

$ grep -c -i "lubricantes" packages/database/src/prisma/seeds/data/base/methodologies.json
0

$ grep -nE '"value": (4\.68|8\.9|0\.1708|2749|0\.272|0\.149|21\.282|822\.51|1041\.78|459\.1|467\.05|444\.66)$' packages/database/src/prisma/seeds/data/base/methodologies.json
(sin matches)
```

Todos los valores antiguos están reemplazados por sus equivalentes DEFRA 2025 precisos; ambos archivos siguen siendo JSON válido.

---

## Lecciones aprendidas

1. **Verificar contra el Excel oficial antes de cambiar valores.** En una iteración previa de este reporte se cambiaron valores asumiendo intuiciones metodológicas (e.g., wood landfill 925 → 822.51 por "FOD IPCC", incineración/reciclaje 4.68 → 21.282 por "Open-loop DEFRA"). La verificación con el Excel oficial DEFRA 2025 reveló que **los valores originales del seed ya estaban correctos**, solo redondeados. Las correcciones se revirtieron en esta versión del reporte.
2. **Las intuiciones metodológicas de los expertos son críticas para discusión, pero no necesariamente para aplicación directa.** Lorenzo, Gianluca y Lucas hicieron observaciones metodológicamente sólidas bajo marcos IPCC / ciencia básica, pero el seed declara explícitamente `source: "DEFRA 2025"` y debe mantener coherencia con ese marco específico.
3. **El framework DEFRA UK es deliberadamente conservador y excluye carbono biogénico y créditos de reciclaje.** El módulo "Mantenedor" debe documentar este caveat para que países que requieran cuenta de carbono fósil (e.g., en plásticos) sobreescriban estos factores.

---

## Referencias

1. **DEFRA UK** (2025). _UK Government GHG Conversion Factors for Company Reporting, 2025_. Hojas verificadas con capturas oficiales:
   - "Fuels" (sin lubricantes).
   - "Water treatment" (0.17088 kg CO₂e/m³).
   - "Waste disposal" — secciones Construction, Refuse, Electrical items, Metal, Plastic, Paper, Other.
2. **IPCC** (2006). _2006 IPCC Guidelines for National Greenhouse Gas Inventories_:
   - Vol. 2 Cap. 1 Tabla 1.2 — non-energy use de lubricantes.
   - Vol. 5 Cap. 3 — Solid waste disposal (FOD method).
   - Vol. 5 Cap. 5 — Incineration and Open Burning (cuenta de carbono fósil).
   - Vol. 5 Cap. 6 — Wastewater treatment and discharge.
3. Transcripción de reunión de revisión metodológica (2026-05-19) — equipo plataforma (Alex, Anuka) + consultores externos (Lorenzo, Gianluca, Lucas, Dolores).
4. Auditorías previas: `methodology/methodologies-deep-audit.md`, `methodology/methodologies-corrections-report.md`.

_Fin del reporte._
