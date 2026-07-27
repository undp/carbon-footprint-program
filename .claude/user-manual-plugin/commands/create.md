---
description: Genera el manual de usuario HTML (y su PDF) de un módulo ya explorado, aplicando el branding del proyecto.
argument-hint: "<modulo|modulo.md|@modulo> [instrucciones adicionales opcionales]"
disable-model-invocation: true
---

Genera el manual de usuario del módulo indicado. Sigue estos pasos en orden.

**Directorio de datos**

> Resuelve `<DATA_DIR>` así: si existe `user-manual-plugin/.claude-plugin/plugin.json` en la raíz
> del proyecto (el plugin está copiado al repo), usa `user-manual-plugin/data/` del proyecto; si
> no, usa `${CLAUDE_PLUGIN_ROOT}/data/`. Usa `<DATA_DIR>` para TODO lo que se escribe o lee de
> branding y módulos.

1. **Prerrequisitos.**
   - Si falta el branding (`<DATA_DIR>/branding/tokens.json` y
     `<DATA_DIR>/branding/manual.css`),
     usa AskUserQuestion: **Ejecutar /user-manual:branding ahora** o **Cancelar**.
   - Si `<DATA_DIR>/modules/index.json` no existe o está vacío,
     usa AskUserQuestion: **Ejecutar /user-manual:explore ahora** o **Cancelar**.

2. **Resuelve el módulo y las instrucciones adicionales desde `$ARGUMENTS`.** El primer token
   es el objetivo del módulo; todo lo que siga (si lo hay) son instrucciones adicionales en
   lenguaje natural para esta generación. Normaliza el objetivo antes de matchear: quita un `@`
   inicial y una extensión `.md` final (`methodology.md` → `methodology`). Matchea el objetivo
   normalizado contra `<DATA_DIR>/modules/index.json` y las fichas `<DATA_DIR>/modules/*.md`:
   exacto → por prefijo → fuzzy. Si no hay objetivo, no hay match o es ambiguo, usa
   AskUserQuestion mostrando la lista de módulos disponibles; si venían instrucciones
   adicionales, consérvalas tras la elección del módulo.
   El **slug de salida** (`<slug_snake>`) es el slug de la ficha con los `-` reemplazados por
   `_` (`mantenedor-metodologia` → `mantenedor_metodologia`): todo lo que se escribe bajo
   `user_manual/` usa snake_case.

3. **Lee el contexto**: la ficha `<DATA_DIR>/modules/<slug>.md`,
   `<DATA_DIR>/branding/tokens.json`,
   `${CLAUDE_PLUGIN_ROOT}/skills/manual-slides/referencias/contrato-css.md`,
   `${CLAUDE_PLUGIN_ROOT}/skills/manual-slides/referencias/plantillas-slides.html`
   y la skill `manual-slides`. Si la ficha tiene **dudas abiertas** o hay ambigüedad funcional
   que afecte el manual, resuélvelas con AskUserQuestion antes de continuar.

4. **Si ya existe `user_manual/<slug_snake>/<slug_snake>.html`**, usa AskUserQuestion:
   **Regenerar desde cero** o **Actualizar secciones específicas**.

5. **Screenshots.** Usa AskUserQuestion:
   - **Capturar con Playwright** — en la pregunta siguiente pide la URL. Requiere datos
     ficticios obligatorios (nunca datos reales de personas). Resolución **1920** (desktop; este
     proyecto no documenta vistas responsivas). Nombres: `overview.png`, `tabla.png`,
     `formulario.png`, `detalle.png`, `dialog-*.png`. Guardar en `user_manual/screenshots/<slug_snake>/`.
   - **Sin capturas** — usar `.screenshot-placeholder`.
     Si el MCP de Playwright no está disponible, degrada a placeholders y avísalo.

6. **Copia el CSS**: `<DATA_DIR>/branding/manual.css` →
   `user_manual/assets/manual.css` (solo si no existe o cambió). Enlázalo en el HTML como
   `../assets/manual.css`: el manual vive en su propia carpeta `user_manual/<slug>/`.

7. **Planifica y escribe el manual** según la skill, usando los templates exactos de
   `plantillas-slides.html`:
   Cover → Objectives (siempre 3) → Index (2 columnas) → [Divider + Content] × N →
   Back cover (la misma lámina de portada, repetida como cierre).
   Entre **10 y 20 slides** según la complejidad del módulo (la contraportada no cuenta).
   Si hubo instrucciones adicionales, aplícalas sobre la ficha del módulo y el workflow (por
   ejemplo: énfasis en un flujo, secciones a incluir u omitir, profundidad o tono).
   Escribe el archivo en `user_manual/<slug_snake>/<slug_snake>.html`.

8. **Reglas duras**: máx 20 slides (sin contar la contraportada); estructura Cover →
   Objectives (3) → Index → [Divider + Content] × N → Back cover; ninguna lámina sobre 810 px de
   alto (si se pasa, reduce el screenshot con `annotated-screenshot--sm`/`--xs`); sin vistas
   responsivas; máx 2 info/tip-box por slide; máx 6-7 callouts por
   screenshot; español neutro en segunda persona; sin jerga técnica (API, base de datos); sin
   datos reales de personas. Estas reglas priman siempre sobre las instrucciones adicionales:
   si algo pedido en ellas choca con una regla dura, aplica la regla dura y avisa al usuario.

9. **Verificación visual** a **1440×810** (Playwright si está disponible): cada slide completa
   sin cortes, callouts alineados, imágenes que cargan, footer y páginas correctos. Luego usa
   AskUserQuestion: ¿algún ajuste antes de generar el PDF?

10. **Genera el PDF**:
    ```bash
    node ${CLAUDE_PLUGIN_ROOT}/skills/manual-slides/referencias/exportar-pdf.cjs \
      "user_manual/<slug_snake>/<slug_snake>.html" "user_manual/<slug_snake>/<slug_snake>.pdf"
    ```
    Requiere `playwright-core` y `pdf-lib` en el proyecto. Si faltan, ofrece instalarlas como
    devDependencies (`npm install --save-dev playwright-core pdf-lib`) o saltar el PDF.
