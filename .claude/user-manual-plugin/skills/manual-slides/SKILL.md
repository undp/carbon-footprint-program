---
name: manual-slides
description: "Guía para crear y editar manuales de usuario en formato HTML tipo slides (landscape 16:9) con screenshots anotados y exportación a PDF. Úsala al trabajar en manuales de usuario: planificar capítulos, redactar slides (cover, objetivos, índice, dividers, contenido), anotar capturas con callouts, aplicar el branding del proyecto y exportar el PDF final."
---

# Manual de usuario tipo slides

Genera un capítulo completo de manual de usuario en HTML para un módulo de una
aplicación web: un archivo autocontenido con slides profesionales (landscape 16:9)
y screenshots anotados, listo para exportar a PDF.

Esta skill acompaña a los comandos del plugin `manual`:
`/user-manual:branding`, `/user-manual:branding-update`, `/user-manual:explore`, `/user-manual:explore-update`,
`/user-manual:create`, `/user-manual:update`, `/user-manual:review`.

## Dónde vive cada cosa

**Directorio de datos.** Resuelve `<DATA_DIR>` así: si existe
`user-manual-plugin/.claude-plugin/plugin.json` en la raíz del proyecto (el plugin está copiado al
repo), usa `user-manual-plugin/data/` del proyecto; si no, usa `${CLAUDE_PLUGIN_ROOT}/data/`. Usa
`<DATA_DIR>` para TODO lo que se escribe o lee de branding y módulos.

- **Branding** (tokens, CSS, componentes, guía): `<DATA_DIR>/branding/`
  → `tokens.json`, `manual.css`, `componentes.html`, `branding.html`.
- **Módulos explorados**: `<DATA_DIR>/modules/`
  → `index.json` + una ficha `<slug>.md` por módulo.
- **Referencias** (spec y herramientas): `${CLAUDE_PLUGIN_ROOT}/skills/manual-slides/referencias/`
  → `contrato-css.md`, `plantillas-slides.html`, `exportar-pdf.cjs`.
- **Salida** (en el PROYECTO, cwd, no en el plugin):
  `user_manual/<slug_snake>/<slug_snake>.html`, `user_manual/assets/manual.css`,
  `user_manual/screenshots/<slug_snake>/`, `user_manual/<slug_snake>/<slug_snake>.pdf`.

**Slug de salida.** Las fichas de módulo usan kebab-case (`mantenedor-metodologia.md`), pero
todo lo que se escribe bajo `user_manual/` usa **snake_case**: `<slug_snake>` es el slug con
los `-` reemplazados por `_` (`mantenedor-metodologia` → `mantenedor_metodologia`), igual que
`user_manual` mismo.

## Formato

Solo **slide landscape** 16:9, pensado para verse completo a **1440×810**. El `<body>`
lleva `class="format-slide"`. No hay formato carta ni toggle de formato.

---

## Workflow (9 pasos)

### Paso 0 — Prerrequisitos

- Confirmar que existe **branding** (`<DATA_DIR>/branding/tokens.json` + `manual.css`). Si falta,
  correr `/user-manual:branding` antes.
- Confirmar que el módulo a documentar tiene **ficha** en `<DATA_DIR>/modules/`. Si no, correr
  `/user-manual:explore`.
- Si el módulo ya tiene `user_manual/<slug_snake>/<slug_snake>.html`, decidir con el usuario:
  **regenerar desde cero** o **actualizar** secciones puntuales.

### Paso 1 — Investigar el módulo

Leer la ficha `<DATA_DIR>/modules/<slug>.md` y, si hace falta, el código del módulo. Documentar:
vistas/pantallas, componentes interactivos (formularios, tablas, dialogs, drawers),
estados y transiciones, y métricas/KPIs si existen.
Si la ficha tiene **dudas abiertas** que afecten el manual, resolverlas con el usuario.

### Paso 2 — Obtener screenshots

Capturar con Playwright desde la app en vivo (si está disponible) o usar placeholders.

- Resolución: **1920** (desktop vista completa); el detalle puede ser 1440 o un crop del 1920.
  Los manuales de este proyecto **no documentan vistas responsivas** (no se capturan tablet ni móvil).
- Nombres: `overview.png`, `tabla.png`, `formulario.png`/`crear.png`/`editar.png`,
  `detalle.png`, `dialog-*.png`.
- Guardar en `user_manual/screenshots/<slug_snake>/`.
- **Datos ficticios obligatorios**: nunca datos reales de personas. Usar nombres
  inventados (p. ej. "González Muñoz, Carlos") y códigos genéricos. Si la app trae datos
  reales, interceptarlos/reemplazarlos antes de capturar (`page.route()`).
- **Los correos van siempre en `@example.com`** (o `.org`/`.net`), los dominios que
  la RFC 2606 reserva para documentación. Un dominio inventado que suena plausible
  es registrable por cualquiera mañana: implica una organización real y desvía el
  mail que un lector copie del manual. Los nombres de empresa inventados sí sirven
  tal cual — el problema es solo el dominio.
- Sin Playwright: usar `.screenshot-placeholder` describiendo qué mostrará cada captura.

### Paso 3 — Planificar la estructura de slides

Estructura mínima del capítulo:

```
COVER        → Portada con screenshot del módulo
OBJECTIVES   → "Objetivos del manual de usuarios de <Módulo>" + 3 objetivos con íconos (siempre 3)
INDEX        → Índice de contenidos en 2 columnas
[DIVIDER + CONTENT] × N  → Separador de sección + contenido, por cada sección
BACK COVER   → Cierre: la misma lámina de portada, repetida
```

El capítulo **cierra con la portada repetida** (mismo markup, `data-page` corriendo). No va en
el índice y no cuenta para la extensión acordada.

#### Acordar la extensión (obligatorio antes de escribir)

No hay tope fijo ni tramos por tipo de módulo: **la extensión la decides tú a partir del contenido
que este módulo realmente tiene**, y la confirmas con el usuario antes de escribir. Un módulo
"simple" con seis estados y tres diálogos puede necesitar más láminas que uno "complejo" de
recorrido lineal; el número sale del inventario, no de una etiqueta.

**1 · Inventaria lo que hay que cubrir.** Con la ficha (y el código si hace falta), lista las
unidades de contenido: cada vista, cada paso de un flujo, cada formulario con sus campos
obligatorios, cada diálogo o acción secundaria (adjuntos, comentarios, descargas), los estados y
avisos, y los casos de borde que la persona va a encontrar. Una unidad es algo que alguien
necesita para poder actuar; si no lo necesita, no entra ni al inventario ni al manual.

**2 · Agrupa en láminas según lo que aguanta una lámina.** Los límites de densidad son los que
fuerzan las divisiones, no un cupo: una lámina sostiene **una captura anotada con 6-7 callouts
como máximo**, hasta **2 info/tip-box**, y nunca pasa de **810 px de alto**. Un tema que no cabe
ahí se parte en dos; dos temas que sobran en media lámina se juntan. Suma después el andamiaje
fijo: portada + objetivos + índice (3), un divider por sección, y la contraportada (que no cuenta).

**3 · Propón el número que salió y confírmalo con AskUserQuestion.** No preguntes en abstracto:
muestra de dónde viene. Ofrece tu cálculo como primera opción (marcada «(Recomendado)») y dos
alternativas reales —una más breve y una más extensa— explicando en cada una **qué cobertura se
gana o se pierde**, no solo el número. La opción «Other» deja al usuario fijar el suyo. Por ejemplo:

> **Pregunta:** Conté 12 unidades de contenido (5 pasos, 3 diálogos, 2 rutas de entrada, factores,
> guardado del borrador) y 5 secciones. ¿Qué extensión le doy al capítulo?
> **Opciones:** `20 láminas (Recomendado)` — una de detalle por paso, más respaldo, total directo y
> factores · `15 láminas` — un paso por lámina, sin las de detalle: se pierden los casos de borde ·
> `26 láminas` — cada diálogo y cada caso de borde con su propia lámina.

**4 · Trata lo acordado como presupuesto, no como pared.** Escribe dentro de eso. Si al planificar
o al escribir descubres que el contenido verificado no cabe, **vuelve a preguntar** con el número
que sí calza y qué lo exige; nunca lo excedas en silencio, ni rellenes con láminas de adorno para
llegar a la cifra, ni recortes contenido verificado para forzarla.

### Paso 4 — Preparar el HTML

- Crear `user_manual/<slug_snake>/<slug_snake>.html` a partir del esqueleto de `plantillas-slides.html`.
  El HTML vive en su propia carpeta, así que `assets/` y `screenshots/` se referencian
  **un nivel arriba** (`../assets/…`, `../screenshots/<slug_snake>/…`).
- Copiar `<DATA_DIR>/branding/manual.css` → `user_manual/assets/manual.css` (si no existe o cambió)
  y enlazarlo con `<link rel="stylesheet" href="../assets/manual.css">`.
- Personalizar: `<title>` = "Manual de Usuario — <Nombre Módulo> | <APP_NAME>";
  ícono del módulo en cover y dividers; footer "APP_NAME | vista <Módulo> | versión X";
  cover con título, screenshot y versión.

### Paso 5 — Escribir cada slide

Usar los templates **exactos** de `plantillas-slides.html` (no inventar clases).
Tipos disponibles: cover, objectives, index, divider, content con screenshot anotado,
content split (texto 45% / visual 55%) y content con tabla de estados.
Callouts: `top/left` en % relativos a la imagen (el CSS ya centra con `translate(-50%,-50%)`);
máx 6-7 por screenshot; numerar de izquierda a derecha y de arriba a abajo. Con más de 4
items en la leyenda, usar `class="annotation-legend cols-3"`.

### Paso 6 — Elementos complementarios

Info-box, tip-box, feature-list, data-table con status-dot y screenshot-placeholder, según
las plantillas. Respetar máximo 2 info/tip-box por slide.

### Paso 7 — Verificar visualmente

Si Playwright está disponible, abrir el HTML a **1440×810** y verificar: cada slide se ve
completa (sin cortes), los callouts calzan con el screenshot, todos los `<img>` cargan, el
footer y el número de página aparecen en todas las slides, y el índice tiene páginas correctas.

### Paso 8 — Confirmar con el usuario

Antes del PDF, preguntar (AskUserQuestion) si quiere ajustes o si está listo para generar.

### Paso 9 — Generar PDF

Ejecutar el script parametrizado:

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/manual-slides/referencias/exportar-pdf.cjs \
  "user_manual/<slug_snake>/<slug_snake>.html" "user_manual/<slug_snake>/<slug_snake>.pdf"
```

Requiere `playwright-core` y `pdf-lib`, ya declaradas como devDependencies en la raíz del repo:
basta `pnpm install`. Si faltaran, instalarlas con el gestor del proyecto
(`pnpm add -Dw playwright-core pdf-lib`) u ofrecer saltar el PDF. Nunca `npm install` en este
workspace: crea un `package-lock.json` paralelo al `pnpm-lock.yaml`.

---

## Secciones típicas por tipo de módulo

**Tabla + formulario**

1. Información general (overview) · 2. Crear/Editar registros (formulario) ·
2. Gestión de registros (tabla, estados) · 4. Métricas/KPIs (si aplica).

**Mapa + datos**

1. Mapa en vivo (capas, interacciones) · 2. Gestión asociada (si aplica) ·
2. Solicitudes/Registros (tabla, formulario, ciclo de vida) · 4. Métricas KPI.

**Dashboard / métricas**

1. Vista general (dashboard) · 2. Filtros y controles · 3. Gráficos y tablas ·
2. Exportación de datos.

---

## Guía de tono y redacción

- **Profesional y conciso**, sin jerga innecesaria.
- **Segunda persona**: "Presiona el botón", "Selecciona el operador".
- **Español neutro**, sin regionalismos.
- Títulos de slide: 3-5 palabras, descriptivos.
- Descripciones: 2-3 líneas máximo; explicar el "qué" y el "para qué".
- Feature list: 1 línea por feature, con el nombre en negrita.
- Info/tip box: 1-2 líneas.
- Leyenda de callouts: breve, "**Etiqueta:** qué hace".

## Reglas duras (no romper)

- **Extensión acordada con el usuario** (ver Paso 3): confirma el rango con AskUserQuestion antes
  de escribir y no lo excedas sin volver a preguntar. La contraportada no cuenta.
- El capítulo **cierra repitiendo la lámina de portada**.
- Máximo **2 info-box o tip-box** por slide.
- Máximo **6-7 callouts** por screenshot.
- Ninguna lámina supera los **810 px** de alto. Si una se pasa (típicamente descripción +
  leyenda larga + info/tip-box), reduce el screenshot con `annotated-screenshot--sm` (74%) o
  `--xs` (62%): el escalado es proporcional y los callouts siguen calzando.
- No duplicar información entre slides.
- No incluir texto técnico de implementación (API, base de datos).
- Solo formato slide (landscape); sin formato carta ni toggle.
- **No documentar vistas responsivas**: este proyecto no las presenta en los manuales.
- **Nunca datos reales de personas** en los screenshots — siempre datos ficticios, con
  los correos en `@example.com`.

## Checklist final

- [ ] Extensión confirmada con el usuario (AskUserQuestion) antes de escribir, y el capítulo cabe
      en lo acordado.
- [ ] HTML creado con todas las slides (cover, objetivos, índice, dividers, contenido).
- [ ] `manual.css` copiado a `user_manual/assets/` y enlazado como `../assets/manual.css`.
- [ ] Screenshots (o placeholders) en `user_manual/screenshots/<slug_snake>/`; todos los `<img src>`
      apuntan a `../screenshots/<slug_snake>/` y resuelven.
- [ ] Posiciones de callout verificadas visualmente.
- [ ] Footer y número de página correctos en TODAS las slides.
- [ ] Ícono del módulo correcto en cover y dividers.
- [ ] Índice con números de página correctos.
- [ ] Sin datos reales; solo datos ficticios, con los correos en `@example.com`.
- [ ] Preguntado al usuario si quiere ajustes antes del PDF.
- [ ] PDF generado sin cortes de contenido.
- [ ] Prueba de comprensión (10 preguntas al subagente) y sus vacíos resueltos — se cubre con
      `/user-manual:review`.
- [ ] Revisión con Codex ofrecida y hallazgos aceptados aplicados — se cubre con
      `/user-manual:review`.

---

## Revisión del manual (`/user-manual:review`)

Cerrar el manual **no** es lo mismo que revisarlo. La revisión vive en su propio comando,
`/user-manual:review @<modulo>` (o una ruta `.html`), y combina dos pasadas independientes:

- **Prueba de comprensión.** Comprobar que el manual **se sostiene solo**: **10 preguntas** que una
  persona usuaria debería poder responder con él (camino completo, campos obligatorios, avisos y
  estados, acciones secundarias como adjuntos o descargas, y al menos dos casos de borde) lanzadas a
  un subagente (Agent tool, `subagent_type: general-purpose`, `model: sonnet`) cuya **única fuente
  permitida** es el HTML del manual y las capturas que referencia — sin código de la app, sin fichas
  del plugin, sin conocimiento previo: si el manual no lo dice, la respuesta es «el manual no lo
  dice». Responde cada pregunta con respuesta breve + número de página + marca
  **RESPONDIDA / INFERIDA / NO ESTÁ**, y cierra con los **vacíos del manual**. Cada INFERIDA o NO
  ESTÁ es un hueco candidato.
- **Revisión con Codex (opcional).** Contrastar el manual (HTML + capturas) con el **código real**
  del módulo y su ficha, y reportar mejoras, inconsistencias, pasos faltantes, aclaraciones y
  contenidos incompletos, por severidad, con ubicación en el manual y evidencia en el código
  (`archivo:línea`).

Todo hallazgo se **verifica en el código antes de aplicarlo**; lo que no se sostiene se descarta con
justificación. Los cambios que se apliquen respetan el contrato de clases y las reglas duras de
arriba, y se re-verifican a **1440×810** antes de regenerar el PDF. Los detalles operativos (comando
exacto de `codex exec`, formato de la consolidación) están en el comando.

---

## Referencias

- `referencias/contrato-css.md` — inventario de tokens `--brand-*` y de todas las clases,
  con la especificación estructural para regenerar `manual.css` desde cero.
- `referencias/plantillas-slides.html` — HTML canónico por tipo de slide con placeholders.
- `referencias/exportar-pdf.cjs` — script Node parametrizado para exportar el PDF.
