---
description: Revisa un manual ya generado (prueba de comprensión con subagente + revisión opcional con Codex) y aplica los hallazgos verificados.
argument-hint: "@<modulo>|<ruta.html> [foco opcional de la revisión]"
disable-model-invocation: true
---

Revisa un manual (capítulo) **ya generado**: comprueba que **se sostiene solo**, contrástalo con el
código real del módulo y aplica los hallazgos que se verifiquen. Sigue estos pasos en orden.

**Directorio de datos**

> Resuelve `<DATA_DIR>` así: si existe `user-manual-plugin/.claude-plugin/plugin.json` en la raíz
> del proyecto (el plugin está copiado al repo), usa `user-manual-plugin/data/` del proyecto; si
> no, usa `${CLAUDE_PLUGIN_ROOT}/data/`. Usa `<DATA_DIR>` para TODO lo que se escribe o lee de
> branding y módulos.

1. **Resuelve el target desde `$ARGUMENTS`.** El **primer token** es el objetivo; el **resto** (si
   lo hay) es un foco opcional para la revisión (una sección, un flujo, un tipo de hallazgo).
   - Empieza con `@` → es un módulo; resuelve a `user_manual/<slug_snake>/<slug_snake>.html`,
     donde `<slug_snake>` es el slug de la ficha con los `-` reemplazados por `_`.
   - Termina en `.html` → es una ruta; úsala directo.
   - Si el HTML no existe, no se identifica o es ambiguo → usa AskUserQuestion listando los manuales
     existentes (glob `user_manual/*/*.html`).

2. **Lee el contexto**: el HTML objetivo, las capturas que referencia
   (`user_manual/screenshots/<slug_snake>/`), la ficha `<DATA_DIR>/modules/<slug>.md`,
   `${CLAUDE_PLUGIN_ROOT}/skills/manual-slides/referencias/contrato-css.md` y la skill
   `manual-slides` (reglas duras y checklist final), para poder aplicar cambios sin romper el
   contrato de clases. Si falta la ficha del módulo, **advierte pero continúa**: la prueba de
   comprensión no la necesita y la revisión con Codex puede apoyarse solo en el código.

3. **Prueba de comprensión (subagente Sonnet).** Formula **10 preguntas** que una persona usuaria
   debería poder responder con el manual: el camino completo de punta a punta, los campos
   obligatorios, los avisos y estados, las acciones secundarias (adjuntos, comentarios, descargas)
   y **al menos dos casos de borde** del flujo. Lánzalas a un subagente con el Agent tool
   (`subagent_type: general-purpose`, `model: sonnet`):
   - **Única fuente permitida**: `user_manual/<slug_snake>/<slug_snake>.html` y las capturas que ese
     HTML referencia (`user_manual/screenshots/<slug_snake>/`). Prohíbele explícitamente leer el
     código de la aplicación, las fichas del plugin y cualquier otro archivo, y apoyarse en
     conocimiento previo: si el manual no lo dice, la respuesta correcta es «el manual no lo dice».
   - **Formato de respuesta**: por pregunta, respuesta breve + número de página donde está + una
     marca **RESPONDIDA / INFERIDA / NO ESTÁ**; al final, una sección de **vacíos del manual**.
   - Cada INFERIDA o NO ESTÁ es un hueco candidato del manual: entra a la consolidación del paso 6,
     no se corrige a ciegas.

4. **Revisión con Codex (opcional).** Usa AskUserQuestion: **Revisar con Codex** o **Saltar la
   revisión**. Si acepta, escribe el prompt en un archivo temporal (fuera de `user_manual/`) y
   córrelo:

   ```bash
   codex exec --sandbox read-only --skip-git-repo-check -c model_reasoning_effort=high \
     "$(cat <archivo-con-el-prompt>)" < /dev/null > <salida>.md 2>&1
   ```

   El `< /dev/null` **es obligatorio**: si stdin queda abierto, `codex exec` se cuelga en «Reading
   additional input from stdin…» y nunca arranca (parece "pensando" durante horas). Tarda varios
   minutos: córrelo en **segundo plano**.
   El prompt debe pedir: contrastar el manual (HTML + capturas) con el **código real** del módulo y
   con la ficha `<DATA_DIR>/modules/<slug>.md`, y reportar **mejoras, inconsistencias, pasos
   faltantes, aclaraciones y contenidos o explicaciones incompletas**, ordenados por severidad, con
   ubicación en el manual (lámina/página) y evidencia en el código (`archivo:línea`), **sin
   modificar archivos**.
   La salida de `codex exec` es un **log largo**: el informe final está al final del archivo (busca
   la última marca `codex` y lee desde ahí). No vuelques el log completo al contexto.
   Si el comando `codex` no está disponible, avísalo y sigue con los hallazgos del paso 3.

5. **Verifica antes de creer.** Ningún hallazgo se aplica por venir del subagente o de Codex:
   comprueba **cada uno en el código** del módulo (y contra el HTML del manual) antes de tocar
   nada. Lo que no se sostenga se **descarta con justificación** y se reporta como descartado.

6. **Consolida y decide con el usuario.** Presenta los hallazgos verificados agrupados por
   **severidad** (alta / media / baja), cada uno con la lámina afectada y su evidencia. Luego usa
   AskUserQuestion: **Aplicar todos** · **Seleccionar cuáles** (pregunta cuáles en la pregunta
   siguiente) · **Solo dejar el informe** (sin editar el manual).

7. **Aplica y re-verifica.** Al editar el HTML respeta el **contrato de clases** (no inventar clases
   ni variables) y las **reglas duras**: ninguna lámina
   sobre 810 px de alto (si se pasa, reduce el screenshot con `annotated-screenshot--sm`/`--xs`);
   máx 2 info/tip-box por lámina; máx 6-7 callouts por screenshot; **índice sincronizado** (títulos
   y números de página) si agregas o quitas láminas; español neutro en segunda persona; sin jerga
   técnica (API, base de datos); sin datos reales de personas.
   **Extensión:** no hay tope fijo. Prefiere corregir texto existente antes que agregar láminas,
   pero si algún hallazgo verificado necesita una lámina nueva, confírmalo con **AskUserQuestion**
   antes de escribirla: di cuántas láminas tiene el manual hoy, cuántas quedarían y qué hallazgo lo
   exige (la contraportada no cuenta). Nunca descartes un hallazgo verificado solo por no alargar el
   manual: si no cabe, la decisión es del usuario.
   Después **re-verifica visualmente a
   1440×810** (Playwright si está disponible) las láminas tocadas: completas sin cortes, callouts
   alineados, imágenes que cargan, footer y números de página correctos.

8. **Higiene de la carpeta.** Independiente de los hallazgos, audita la carpeta del capítulo.
   Ambas verificaciones deben salir vacías:

   ```bash
   # (a) Capturas en disco que el capítulo no referencia.
   comm -13 \
     <(grep -oP "(?<=src=\")\.\./screenshots/<slug_snake>/[^\"]+" \
         "user_manual/<slug_snake>/<slug_snake>.html" | sed 's|.*/||' | sort -u) \
     <(ls "user_manual/screenshots/<slug_snake>/" | sort)

   # (b) Referencias remotas: el capítulo debe abrirse y exportarse sin red.
   grep -rn "https\?://" "user_manual/<slug_snake>/<slug_snake>.html" user_manual/assets
   ```

   Reporta lo que salga como un hallazgo más y **pregunta con AskUserQuestion antes de borrar**
   capturas. Esto es mecánico y no debería depender de que alguien se acuerde: una captura
   huérfana queda permanente en cada clon y vuelve indistinguible lo vivo de lo abandonado.

9. **PDF.** Si se aplicaron cambios, usa AskUserQuestion para ofrecer regenerarlo:

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/skills/manual-slides/referencias/exportar-pdf.cjs \
     "user_manual/<slug_snake>/<slug_snake>.html" "user_manual/<slug_snake>/<slug_snake>.pdf"
   ```

10. **Resumen final**: hallazgos aplicados, hallazgos descartados con su motivo, láminas
    modificadas, lo que salió de la higiene de la carpeta y vacíos que quedaron abiertos (si el
    usuario eligió solo el informe).
