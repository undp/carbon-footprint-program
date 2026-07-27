# Plugin `user-manual`

Genera manuales de usuario en formato HTML tipo **slides** (landscape 16:9) con
screenshots anotados, adaptados al **branding** del proyecto, y exportables a PDF.

El plugin detecta la identidad visual de tu aplicación, explora sus módulos y produce
un capítulo de manual por módulo, listo para entregar.

## Qué hace

Seis comandos que se encadenan en un flujo:

1. **`/user-manual:branding [indicaciones]`** — detecta la identidad del proyecto
   (colores, tipografía, componentes) y genera el branding del manual: `tokens.json`,
   `manual.css`, `componentes.html` y una guía de estilo navegable `branding.html`.
2. **`/user-manual:branding-update <cambios>`** — aplica ajustes puntuales al branding ya
   generado (colores, tipografía o componentes) sin rehacerlo todo.
3. **`/user-manual:explore`** — explora la app (código y/o Playwright) y crea una **ficha**
   por cada módulo descubierto, más un índice de módulos.
4. **`/user-manual:explore-update`** — actualiza el mapa de módulos de forma **incremental**,
   detectando los nuevos, los cambiados y los obsoletos sin regenerar todo.
5. **`/user-manual:create @<modulo>`** — genera el manual HTML del módulo (cover, objetivos,
   índice, secciones con screenshots anotados) y su PDF.
6. **`/user-manual:update @<modulo> <cambios>`** — edita un manual ya generado aplicando
   los cambios descritos en lenguaje natural.

### Ejemplo de flujo

```
/user-manual:branding                 # una vez por proyecto
/user-manual:explore                  # descubre los módulos
/user-manual:create @inventario       # genera user_manual/inventario/inventario.html + .pdf
```

## Requisitos

- **Claude Code**.
- **MCP de Playwright** (opcional): para exploración en vivo y captura de screenshots.
  Sin él, la exploración se limita al código y los manuales usan placeholders.
- **`playwright-core` + `pdf-lib`** en el proyecto para exportar el PDF:
  `npm install --save-dev playwright-core pdf-lib`.

## Instalación

En **este repo** el plugin ya viene empaquetado como un marketplace de repo
committeado: vive en `.claude/user-manual-plugin/`, expuesto vía
`.claude-plugin/marketplace.json` (marketplace `cfp-plugins`) y habilitado desde
`.claude/settings.json` (`enabledPlugins: user-manual@cfp-plugins`). Para tenerlo
disponible solo hace falta:

```bash
git pull
```

y aceptar el prompt de Claude Code para **confiar e instalar** el marketplace
`cfp-plugins` la primera vez que abras el repo. No requiere ningún paso manual
adicional.

Como alternativa más simple (sin marketplace), puedes arrancar Claude Code apuntando
directo al directorio del plugin:

```bash
claude --plugin-dir ./.claude/user-manual-plugin
```

> **Notas.**
>
> 1. Gracias a la resolución de `<DATA_DIR>`, con el plugin copiado dentro del proyecto los
>    datos (branding y fichas de módulos) quedan en `user-manual-plugin/data/` **del proyecto**
>    (versionable y persistente), no en un cache efímero.
> 2. Nota: el cache se indexa por versión del plugin. Para que cambios en la fuente
>    apliquen a la copia instalada: sube `version` en `.claude-plugin/plugin.json` y corre
>    `claude plugin marketplace update <mkt>` seguido de
>    `claude plugin update user-manual@<mkt>`. Si no quieres subir la versión, reinstala:
>    `claude plugin uninstall user-manual@<mkt> --scope project && claude plugin install user-manual@<mkt> --scope project`.

## Dónde queda cada cosa

| Contenido                                 | Ubicación                                                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Branding (tokens, CSS, componentes, guía) | `<DATA_DIR>/branding/` (`user-manual-plugin/data/branding/` del proyecto si el plugin está copiado al repo) |
| Fichas de módulos e índice                | `<DATA_DIR>/modules/` (`user-manual-plugin/data/modules/` del proyecto si el plugin está copiado al repo)   |
| Manuales HTML generados                   | `user_manual/<slug_snake>/<slug_snake>.html` **del proyecto**                                               |
| CSS del manual                            | `user_manual/assets/manual.css` **del proyecto**                                                            |
| Screenshots                               | `user_manual/screenshots/<slug_snake>/` **del proyecto**                                                    |
| PDF final                                 | `user_manual/<slug_snake>/<slug_snake>.pdf` **del proyecto**                                                |

Las fichas de módulo usan kebab-case; todo lo que se escribe bajo `user_manual/` usa
**snake_case** (`<slug_snake>` = el slug con `-` → `_`). El HTML vive en su propia carpeta y
enlaza los assets compartidos un nivel arriba (`../assets/`, `../screenshots/<slug_snake>/`).

## Validación

```bash
claude plugin validate ./.claude/user-manual-plugin
```

## Estructura del plugin

```
user-manual-plugin/
├── .claude-plugin/plugin.json
├── README.md
├── commands/            branding, branding-update, explore, explore-update,
│                        create, update
├── skills/manual-slides/
│   ├── SKILL.md
│   └── referencias/     contrato-css.md, plantillas-slides.html,
│                        exportar-pdf.cjs
└── data/                branding/ y modules/ (se llenan en runtime)
```
