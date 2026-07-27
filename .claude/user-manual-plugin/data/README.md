# data/ — almacenamiento en runtime

Esta carpeta guarda el estado que los comandos del plugin producen y consumen.
Todo lo que vive aquí se genera en **tiempo de ejecución**; el plugin se distribuye
con las carpetas vacías (solo `.gitkeep`).

## branding/

La escribe `/user-manual:branding` (y la ajusta `/user-manual:branding-update`):

| Archivo            | Contenido                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `tokens.json`      | Todos los tokens `--brand-*`, `--font-main` y metadatos (nombre de la app, organización, idioma).  |
| `manual.css`       | Hoja de estilos completa de los slides, con TODAS las clases del contrato usando `var(--brand-*)`. |
| `componentes.html` | Snippets de componentes adaptados al branding del proyecto.                                        |
| `branding.html`    | Guía de estilo navegable (paleta, tipografía, componentes renderizados).                           |

## modules/

La escribe `/user-manual:explore`:

| Archivo         | Contenido                                                                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.json`    | Lista de módulos descubiertos: `[{slug, titulo, fuente, estado, fecha}]`.                                                                                  |
| `<slug>.md`     | Ficha de cada módulo: propósito, rutas, pantallas, acciones, entidades, estados, referencias de código, dudas abiertas y evidencia.                        |
| `baseline.json` | Línea base git de la última exploración: `{commit, branch, fecha}`. La usa `/user-manual:explore-update` para re-explorar por `git diff` solo lo cambiado. |

## Nota de persistencia

Estos datos se resuelven en `<DATA_DIR>`: si el plugin está **copiado dentro del
proyecto** (existe `user-manual-plugin/.claude-plugin/plugin.json` en la raíz del repo), los
comandos escriben y leen en `user-manual-plugin/data/` **del proyecto** — esta misma carpeta,
versionable y persistente.

Solo caen a `${CLAUDE_PLUGIN_ROOT}/data/` cuando el plugin **no** está copiado en el
proyecto (por ejemplo, instalado desde un marketplace remoto): en ese caso vive en un
**cache efímero** que se reemplaza en cada actualización, y el branding y las fichas de
módulos se perderían. Para trabajo real, copia el plugin dentro del propio proyecto.
