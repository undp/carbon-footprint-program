---
description: Detecta la identidad visual del proyecto y genera el branding del manual (tokens, CSS, componentes y guía de estilo).
argument-hint: "[indicaciones opcionales de identidad]"
disable-model-invocation: true
---

Genera el branding del manual para este proyecto. Sigue estos pasos en orden.

**Directorio de datos**

> Resuelve `<DATA_DIR>` así: si existe `manual-plugin/.claude-plugin/plugin.json` en la raíz
> del proyecto (el plugin está copiado al repo), usa `manual-plugin/data/` del proyecto; si
> no, usa `${CLAUDE_PLUGIN_ROOT}/data/`. Usa `<DATA_DIR>` para TODO lo que se escribe o lee de
> branding y módulos.

1. **Lee las referencias** por path explícito:
   - `${CLAUDE_PLUGIN_ROOT}/skills/manual-slides/referencias/contrato-css.md`
   - `${CLAUDE_PLUGIN_ROOT}/skills/manual-slides/referencias/plantillas-slides.html`

2. **Prechequeo.** Si ya existe `<DATA_DIR>/branding/tokens.json`,
   usa AskUserQuestion para preguntar cómo proceder:
   - **Sobrescribir todo** — regenerar el branding completo desde cero.
   - **Hacer ajustes puntuales** — deriva a `/manual:branding-update` y termina.
   - **Cancelar** — no hacer nada y terminar.

3. **Explora el código del proyecto** para detectar la identidad visual:
   `tailwind.config.*`, archivos de theme, bloques `:root` con variables CSS, temas de
   MUI / styled-components / Chakra u otros, fuentes tipográficas, logos, y componentes UI
   característicos (botones, tablas, badges/estados, cards). Anota los valores detectados
   (color primario, variantes, tipografía, etc.).

4. **Pregunta al usuario** (1-2 llamadas AskUserQuestion, máx 4 preguntas por llamada,
   opciones concretas y "Other" siempre disponible):
   - Nombre de la aplicación.
   - Nombre de la organización.
   - Idioma/variante de los manuales y público objetivo.
   - Confirmación del **color primario** y la **tipografía** detectados: muestra los valores
     detectados como opción recomendada, con alternativa de ingresar valores manuales.
   Toma en cuenta `$ARGUMENTS` como indicaciones de identidad si vienen.

5. **Construye DESDE CERO** (nunca copies un CSS preexistente; deriva del contrato):
   - `<DATA_DIR>/branding/tokens.json`: todos los tokens `--brand-*`
     + `--font-main` + metadatos (nombre de app, organización, idioma).
   - `<DATA_DIR>/branding/manual.css`: TODAS las clases del contrato,
     usando `var(--brand-*)` (sin hex hardcodeados salvo `#fff` donde el contrato lo indica).
   - `<DATA_DIR>/branding/componentes.html`: snippets de los componentes
     adaptados al branding.

6. **Genera la guía de estilo navegable** `<DATA_DIR>/branding/branding.html`:
   paleta con swatches y códigos hex, escala tipográfica, colores de estado, y CADA componente
   de slide renderizado como ejemplo: cover, objectives, index, divider, content con
   annotated-screenshot y callouts, info-box, tip-box, feature-list, data-table, status-dot,
   content-split, screenshot-placeholder y footer. Enlaza `manual.css`.

7. **Verificación visual** (si el MCP de Playwright está disponible): abre `branding.html` a
   **1440×810** y confirma que la guía y los componentes se ven correctos. Si Playwright no
   está disponible, avísalo y continúa.

8. **Resumen final**: lista los archivos generados con sus paths absolutos y las decisiones de
   marca tomadas (color primario y variantes, tipografía, nombre de app/organización, idioma).
