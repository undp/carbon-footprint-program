---
description: Actualiza incrementalmente el mapa de módulos usando git diff desde la última exploración; re-explora solo los módulos que cambiaron.
disable-model-invocation: true
---

Actualiza el mapa de módulos de forma **incremental**: parte de la línea base git de la última
exploración y re-explora **solo** los módulos cuyos archivos cambiaron. Actúas como **agente
orquestador**. Sigue estos pasos.

**Directorio de datos**

> Resuelve `<DATA_DIR>` así: si existe `user-manual-plugin/.claude-plugin/plugin.json` en la raíz
> del proyecto (el plugin está copiado al repo), usa `user-manual-plugin/data/` del proyecto; si
> no, usa `${CLAUDE_PLUGIN_ROOT}/data/`. Usa `<DATA_DIR>` para TODO lo que se escribe o lee de
> branding y módulos.

**Paso 1 — Prechequeo.** Si `<DATA_DIR>/modules/index.json` no existe o está vacío, usa
AskUserQuestion: **Ejecutar /user-manual:explore ahora** o **Cancelar**. Sin exploración previa no hay
base contra la cual comparar.

**Paso 2 — Carga el estado.** Lee `<DATA_DIR>/modules/index.json`, las fichas
`<DATA_DIR>/modules/<slug>.md` (fíjate en sus **referencias de código**/paths) y, si existe,
`<DATA_DIR>/modules/baseline.json` (`{commit, branch, fecha}`).

**Paso 3 — Modo.** Con AskUserQuestion elige: **Solo código** · **Solo Playwright** · **Ambas**.
Si incluye Playwright, pregunta (AskUserQuestion, máx 4): URL base, ruta inicial y credenciales o
datos de prueba (solo para la sesión). **Nunca** registres secretos ni datos reales en las fichas.

**Paso 4 — Alcance del re-escaneo.** Decide entre incremental y completo:

- Si **no** existe `baseline.json`, **o** el proyecto no es repo git (`git rev-parse
--is-inside-work-tree` falla), **o** el commit guardado ya no existe (`git cat-file -e
<commit>^{commit}` falla, p. ej. tras rebase/squash) → **exploración completa**: orquesta
  subagentes sonnet (áreas a–d de `/user-manual:explore`) sobre TODO el código, aplica las reglas del
  Paso 6, salta al Paso 7 y anota el motivo del fallback en el resumen.
- Si existe y es válido → **incremental**: archivos cambiados = `git diff --name-only <commit>
HEAD` unido a `git status --porcelain` (cambios sin commitear). Si el set queda **vacío**,
  reporta "sin cambios desde `<commit_corto>` (`<fecha>`)" y **termina sin tocar nada**.

**Paso 5 — Mapeo incremental.** Cruza cada archivo cambiado contra las rutas de código
registradas en las fichas y prepara subagentes **acotados** (nunca al repo entero):

- Archivo bajo las rutas de un módulo existente → ese módulo es **candidato CAMBIADO**; lanza un
  subagente acotado a esas rutas/directorios.
- Archivos que no mapean a ningún módulo (nuevas rutas/feature dirs) → **discovery acotado** a
  esos paths para detectar módulos **NUEVO**.
- Módulo cuyas rutas registradas fueron **todas eliminadas** → **OBSOLETO**.
- Módulos no tocados por el diff → **SIN CAMBIOS** (no re-explorar).
  Si el modo incluye Playwright, cruza la navegación en vivo de esas pantallas con el código.

**Paso 6 — Subagentes.** TODOS con `subagent_type: general-purpose` y **`model: sonnet`** (único
modelo permitido; nunca otro). Dales objetivo + alcance acotado; retorno SOLO destilado (módulos
con evidencia `paths:líneas`), nunca volcados de código. Luego consolida y deduplica.

**Paso 7 — Clasificación.** Respecto al baseline, cada módulo queda **NUEVO** / **CAMBIADO** /
**SIN CAMBIOS** / **OBSOLETO**.

**Paso 8 — Escritura selectiva.** Sin clobber de módulos no afectados:

- **NUEVO** → crea su ficha (mismo formato que `/user-manual:explore`: nombre, slug, propósito, rutas,
  pantallas, acciones, entidades, estados, referencias de código, dudas abiertas, evidencia).
- **CAMBIADO** → actualiza su ficha; **preserva** notas y dudas manuales cuando sea posible. Si la
  ficha venía `verificado` (la escribió `/user-manual:review` contra el código), bájala a
  `explorado`: el código se movió y esa revisión ya no la respalda.
- **OBSOLETO** → marca `estado: obsoleto` en `index.json` y anótalo en la ficha; **NO la borres**.
- **SIN CAMBIOS** → no tocar.
  Fusiona `index.json` por `slug` (`{slug, titulo, fuente, estado, fecha}`), refrescando `fecha`
  solo en los módulos tocados.

**Paso 9 — Refresca la línea base.** Salvo que el proyecto no sea repo git, reescribe
`<DATA_DIR>/modules/baseline.json` con el `git rev-parse HEAD` actual, la rama y la fecha ISO.

**Paso 10 — Degradación.** Si el MCP de Playwright no está disponible, continúa **solo con
código** y avísalo.

**Paso 11 — Resumen final.** Indica si fue **update incremental** (rango `<commit_corto>..HEAD` y
nº de archivos cambiados) o **exploración completa** (con el motivo del fallback), seguido de la
tabla diff (slug | título | NUEVO/CAMBIADO/SIN CAMBIOS/OBSOLETO | nota) y el siguiente paso:
`/user-manual:create @<slug>` para los nuevos y `/user-manual:update @<slug>` para los que ya tienen manual
y cambiaron.
