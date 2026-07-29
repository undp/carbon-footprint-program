---
description: Descubre y documenta los módulos de la aplicación explorando código y/o Playwright, con una ficha por módulo.
disable-model-invocation: true
---

Explora la aplicación de este proyecto y documenta sus módulos. Actúas como **agente
orquestador**: delegas la exploración de código a subagentes en paralelo y consolidas sus
conclusiones. Sigue estos pasos.

**Directorio de datos**

> Resuelve `<DATA_DIR>` así: si existe `user-manual-plugin/.claude-plugin/plugin.json` en la raíz
> del proyecto (el plugin está copiado al repo), usa `user-manual-plugin/data/` del proyecto; si
> no, usa `${CLAUDE_PLUGIN_ROOT}/data/`. Usa `<DATA_DIR>` para TODO lo que se escribe o lee de
> branding y módulos.

**Paso 1 — Modo de exploración.** Con AskUserQuestion elige:
**Solo código** · **Solo Playwright** · **Ambas**.

**Paso 2 — Datos para Playwright.** Si el modo incluye Playwright, pregunta (AskUserQuestion,
máx 4 por llamada): URL base (p. ej. `http://localhost:3000`), ruta/página inicial desde donde
empezar, y credenciales o datos de prueba disponibles (úsalos solo para la sesión).
**Nunca** registres secretos ni datos reales de personas en las fichas.

**Paso 3 — Exploración de código (orquestación).** Lanza **múltiples subagentes EN PARALELO**
(tool Agent, `subagent_type: general-purpose`) divididos por áreas para mapear todo el código y
el flujo:

- (a) rutas / navegación / routers / sidebar,
- (b) features / páginas / vistas y su propósito,
- (c) permisos / roles / guards,
- (d) modelos / entidades / estado y flujos de datos.

**Todos los subagentes DEBEN usar `model: sonnet`** — es el único modelo permitido; nunca lances
un subagente con otro modelo. A cada uno dale objetivo + alcance acotado; debe devolver SOLO
conclusiones destiladas (módulos candidatos con evidencia `paths:líneas`, rutas, propósito),
nunca volcados de código. Luego **consolida y deduplica** los retornos en una lista única de
módulos.

**Paso 4 — Exploración con Playwright.** Si el modo la incluye, navega el nav principal con el
MCP de Playwright: enumera pantallas, acciones, formularios, tablas y estados; cruza lo hallado
con el código para segmentar mejor los módulos.

**Paso 5 — Fichas por módulo.** Por cada módulo descubierto escribe `<DATA_DIR>/modules/<slug>.md`
con: nombre, slug, propósito, rutas, pantallas/vistas, acciones principales, entidades,
estados/badges, referencias de código (paths), dudas abiertas y evidencia (código / navegación /
ambas). Actualiza `<DATA_DIR>/modules/index.json` como array de
`{slug, titulo, fuente (codigo|playwright|ambas), estado (explorado|pendiente), fecha}`.
**Fusiona** con los módulos previos (actualiza por `slug`, agrega nuevos); no borres módulos
existentes salvo petición explícita del usuario.

**Paso 6 — Degradación.** Si el MCP de Playwright no está disponible, continúa **solo con código**
y avísalo. El branding **no** es prerrequisito: si falta (`<DATA_DIR>/branding/tokens.json` no
existe), solo menciónalo; no bloquees la exploración.

**Paso 7 — Línea base git.** Si el proyecto es un repo git (`git rev-parse --is-inside-work-tree`
responde OK), escribe `<DATA_DIR>/modules/baseline.json` con exactamente
`{ "commit": "<git rev-parse HEAD>", "branch": "<git rev-parse --abbrev-ref HEAD>", "fecha": "<ISO>" }`.
Esto ancla esta exploración para que `/user-manual:explore-update` compare por `git diff` en vez de
re-barrer todo. Si **no** es repo git, **omite** este paso en silencio y menciónalo en el resumen.
No toca `index.json` ni las fichas: es un archivo aparte.

**Paso 8 — Resumen final.** Entrega una tabla de módulos (slug, título, fuente, dudas abiertas),
indica si se grabó la línea base (commit/rama) o se omitió por no ser repo git, y el siguiente
paso sugerido: `/user-manual:create @<slug>`.
