---
description: Aplica ajustes puntuales al branding existente del manual (colores, tipografía o componentes) sin regenerarlo todo.
argument-hint: "<cambios solicitados>"
disable-model-invocation: true
---

Ajusta el branding del manual ya existente según lo que pida el usuario. Sigue estos pasos.

**Directorio de datos**

> Resuelve `<DATA_DIR>` así: si existe `user-manual-plugin/.claude-plugin/plugin.json` en la raíz
> del proyecto (el plugin está copiado al repo), usa `user-manual-plugin/data/` del proyecto; si
> no, usa `${CLAUDE_PLUGIN_ROOT}/data/`. Usa `<DATA_DIR>` para TODO lo que se escribe o lee de
> branding y módulos.

1. **Prechequeo.** Si NO existe `<DATA_DIR>/branding/tokens.json`, indica al
   usuario que primero debe correr `/user-manual:branding` y termina sin hacer cambios.

2. **Lee el estado actual** y el contrato:
   - `<DATA_DIR>/branding/tokens.json`
   - `<DATA_DIR>/branding/manual.css`
   - `<DATA_DIR>/branding/componentes.html`
   - `${CLAUDE_PLUGIN_ROOT}/skills/manual-slides/referencias/contrato-css.md`

3. **Interpreta `$ARGUMENTS`** como la petición de cambios. Si está vacío o es ambiguo, usa
   AskUserQuestion para acotar el alcance:
   - Opciones: **Colores**, **Tipografía**, **Componentes**, **Todo**.
   - Además pide los valores concretos que se deben aplicar.

4. **Aplica solo los cambios compatibles con el contrato.** Modifica los tokens y clases
   afectados; **conserva** los tokens y estilos que no cambian. No introduzcas clases ni
   variables fuera del contrato.

5. **Regenera** `<DATA_DIR>/branding/branding.html` para reflejar los cambios y,
   si el MCP de Playwright está disponible, verifícalo visualmente a **1440×810**.

6. **Advierte** al usuario: los manuales ya generados en `user_manual/` mantienen el CSS
   antiguo (`assets/manual.css`) hasta que se vuelvan a ejecutar con `/user-manual:create`.

7. **Resumen** de los cambios aplicados (tokens/clases tocados y valores nuevos).
