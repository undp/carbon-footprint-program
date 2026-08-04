# Manuales de usuario

Manuales de usuario final de Huella Latam, uno por vista de la aplicación.
Formato slides landscape 16:9, con capturas anotadas de la app real y una
exportación a PDF de cada capítulo.

Están escritos **para quien usa la plataforma**, no para quien la desarrolla: una
organización que mide su huella, un mantenedor de metodología, un revisor. Por eso
el texto está en español (como toda la interfaz) y describe la app en términos de
lo que se ve en pantalla. La documentación técnica vive en
[`docs/`](../docs/README.md).

## Capítulos

| Capítulo                  | Para quién                                                         | Archivos                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Inicio                    | Cualquier usuario: la guía de primeros pasos y el dashboard        | [HTML](./inicio/inicio.html) · [PDF](./inicio/inicio.pdf)                                                                 |
| Calculadora de huella     | Quien captura datos de actividad y calcula una huella              | [HTML](./calculadora_huella/calculadora_huella.html) · [PDF](./calculadora_huella/calculadora_huella.pdf)                 |
| Huella organizacional     | Quien administra las huellas de su organización y postula a sellos | [HTML](./huella_organizacional/huella_organizacional.html) · [PDF](./huella_organizacional/huella_organizacional.pdf)     |
| Proyectos de reducción    | Quien registra y postula proyectos de reducción de GEI             | [HTML](./proyectos_de_reduccion/proyectos_de_reduccion.html) · [PDF](./proyectos_de_reduccion/proyectos_de_reduccion.pdf) |
| Mantenedor de metodología | Administradores que configuran metodologías y factores de emisión  | [HTML](./mantenedor_metodologia/mantenedor_metodologia.html) · [PDF](./mantenedor_metodologia/mantenedor_metodologia.pdf) |

## Estructura

```
user_manual/
├── assets/
│   ├── manual.css              hoja de estilos única de todos los capítulos
│   └── fonts/                  Material Symbols + Roboto locales (ver su README)
├── screenshots/<slug>/         capturas de ese capítulo
└── <slug>/
    ├── <slug>.html             el capítulo
    └── <slug>.pdf              su exportación
```

Un capítulo es una **carpeta portable**: se abre en cualquier navegador sin
servidor y sin red. Todo lo que necesita —estilos, fuentes, capturas— vive en el
repositorio, así que puede entregarse a una organización que trabaje offline.

Dos reglas que sostienen eso y conviene no romper:

- **Ninguna referencia remota.** Sin hojas de estilo, fuentes ni imágenes
  externas. Si falta un ícono, se regenera el subconjunto local
  ([`assets/fonts/README.md`](./assets/fonts/README.md)).
- **Ninguna captura huérfana.** `screenshots/<slug>/` contiene exactamente lo que
  el capítulo referencia. Las capturas crudas que quedaron fuera del corte se
  borran: si conviven con las que sí se usan, nadie puede distinguirlas después.

Para verificar ambas cosas:

```bash
# Capturas en disco que ningún capítulo referencia (debe salir vacío).
for d in user_manual/screenshots/*/; do slug=$(basename "$d")
  comm -13 \
    <(grep -oP "(?<=src=\")\.\./screenshots/$slug/[^\"]+" "user_manual/$slug/$slug.html" | sed 's|.*/||' | sort -u) \
    <(ls "$d" | sort)
done

# Referencias remotas (debe salir vacío).
grep -rn "https\?://" user_manual --include='*.html' --include='*.css'
```

## Regenerar

Los manuales los produce el plugin `user-manual`, que vive committeado en
[`.claude/user-manual-plugin/`](../.claude/user-manual-plugin/) y se expone como
marketplace del repo. Los comandos corren dentro de Claude Code:

| Comando                        | Qué hace                                                               |
| ------------------------------ | ---------------------------------------------------------------------- |
| `/user-manual:explore <vista>` | Explora la vista y deja una ficha en `data/modules/<slug>.md`          |
| `/user-manual:create <vista>`  | Genera el capítulo HTML + PDF a partir de esa ficha                    |
| `/user-manual:update <vista>`  | Actualiza un capítulo existente                                        |
| `/user-manual:review @<slug>`  | Audita un capítulo: prueba de comprensión y contraste contra el código |

Solo el PDF:

```bash
node .claude/user-manual-plugin/skills/manual-slides/referencias/exportar-pdf.cjs \
  "user_manual/<slug>/<slug>.html" "user_manual/<slug>/<slug>.pdf"
```

Requiere `playwright-core` y `pdf-lib`, ya declaradas como devDependencies en la
raíz del repo: `pnpm install` alcanza. **Regenera el PDF en el mismo commit que
edita el HTML**, para que ningún binario quede describiendo una versión anterior
del capítulo.

## Precisión

Los capítulos afirman constantes y comportamientos del código —límites de tamaño,
formatos aceptados, ventanas de años, umbrales, qué rol puede hacer qué—. Son
correctos al momento de escribirse y **nada avisa cuando el código cambia**. Ante
una duda, la fuente es el código, no el manual; `/user-manual:review` existe para
volver a contrastar capítulo contra código.
