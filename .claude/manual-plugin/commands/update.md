---
description: Actualiza un manual existente aplicando los cambios descritos en lenguaje natural.
argument-hint: "@<modulo>|<ruta.html> <cambios>"
disable-model-invocation: true
---

Edita un manual (capítulo) **ya generado** a partir de su HTML y de un prompt en lenguaje natural
con los cambios pedidos. Sigue estos pasos en orden.

**Directorio de datos**

> Resuelve `<DATA_DIR>` así: si existe `manual-plugin/.claude-plugin/plugin.json` en la raíz
> del proyecto (el plugin está copiado al repo), usa `manual-plugin/data/` del proyecto; si
> no, usa `${CLAUDE_PLUGIN_ROOT}/data/`. Usa `<DATA_DIR>` para TODO lo que se escribe o lee de
> branding y módulos.

1. **Resuelve el target desde `$ARGUMENTS`.** El **primer token** es el objetivo; el **resto** es
   el prompt de cambios.
   - Empieza con `@` → es un módulo; resuelve a `user_manual/<slug_snake>/<slug_snake>.html`,
     donde `<slug_snake>` es el slug de la ficha con los `-` reemplazados por `_`.
   - Termina en `.html` → es una ruta; úsala directo.
   - Si el HTML no existe, no se identifica o es ambiguo → usa AskUserQuestion listando los manuales
     existentes (glob `user_manual/*/*.html`).
   - Si no viene prompt de cambios → pregunta al usuario qué debe cambiar (AskUserQuestion o pregunta
     directa) antes de continuar.

2. **Lee el contexto**: el HTML objetivo, `<DATA_DIR>/branding/tokens.json`,
   `<DATA_DIR>/branding/manual.css`,
   `${CLAUDE_PLUGIN_ROOT}/skills/manual-slides/referencias/contrato-css.md` y
   `${CLAUDE_PLUGIN_ROOT}/skills/manual-slides/referencias/plantillas-slides.html`, para mantener
   fidelidad de clases y estructura. Si falta el branding, **advierte pero continúa**: el HTML ya
   trae su CSS copiado en `user_manual/assets/manual.css` (enlazado como `../assets/manual.css`).

3. **Interpreta el prompt y aplica los cambios al HTML**: editar textos, agregar / eliminar /
   reordenar slides, ajustar callouts, cambiar o insertar screenshots, etc. DEBE respetar:
   - el **contrato de clases** (no inventar clases ni variables fuera del contrato);
   - la **estructura** Cover → Objectives (3) → Index → [Divider + Content] × N;
   - las **reglas duras**: máx 20 slides; máx 2 info/tip-box por slide; máx 6-7 callouts por
     screenshot; español neutro en segunda persona; sin datos reales de personas; sin jerga técnica
     (API, base de datos).
     Si agregas o quitas slides, **mantén el slide Index sincronizado** (títulos y números de página).

4. **Capturas nuevas.** Si algún cambio las requiere, usa AskUserQuestion:
   **Capturar con Playwright** (pide la URL en la pregunta siguiente) o **Usar placeholders**.
   Misma resolución **1920** (sin vistas responsivas), mismo naming (`overview.png`, `tabla.png`,
   `formulario.png`, `detalle.png`, `dialog-*.png`) y **datos
   ficticios obligatorios** que `/manual:create`. Guarda en `user_manual/screenshots/<slug_snake>/`.
   Sin MCP de Playwright, degrada a placeholders y avísalo.

5. **Verificación visual** a **1440×810** (Playwright si está disponible): las slides modificadas se
   ven completas sin cortes, los callouts calzan, las imágenes cargan, footer y números de página
   correctos.

6. **PDF.** Con AskUserQuestion pregunta si regenerar el PDF. Si sí:

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/skills/manual-slides/referencias/exportar-pdf.cjs \
     "user_manual/<slug_snake>/<slug_snake>.html" "user_manual/<slug_snake>/<slug_snake>.pdf"
   ```

7. **Resumen final**: qué slides y secciones se modificaron.
