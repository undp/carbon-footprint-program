# Contrato CSS del manual

Especificación estructural de `manual.css`. **No es CSS copiable**: es el contrato
que otro Claude debe cumplir al **regenerar desde cero** la hoja de estilos con el
branding del proyecto. Todo color y tipografía se expresa como token `var(--brand-*)`
/ `var(--font-main)`; nunca se hardcodean hex salvo blanco puro (`#fff`) para texto
e íconos sobre fondos de marca.

Objetivo del formato: **slide landscape 16:9**, pensado para verse completo a
**1440×810** y exportarse a PDF (una página por slide). No existe formato carta ni
toggle de formato.

---

## 1. Tokens (variables en `:root`)

Todas obligatorias. `tokens.json` guarda estos mismos valores más metadatos.

### Colores de marca (primarios)
| Variable | Rol |
|----------|-----|
| `--brand-primary` | Color principal: acentos, dividers, íconos, números de página, bordes de tip-box. |
| `--brand-primary-dark` | Variante oscura; inicio del gradiente de portada. |
| `--brand-primary-light` | Variante clara; fin del gradiente de portada y fondo de dividers. |

### Colores base
| Variable | Rol |
|----------|-----|
| `--brand-text` | Texto principal. |
| `--brand-text-secondary` | Texto secundario (~60% opacidad del texto). Descripciones, footer. |
| `--brand-text-tertiary` | Texto terciario (~42% opacidad del texto). |
| `--brand-bg` | Fondo general de referencia de los slides. |
| `--brand-surface` | Fondo de las slides de contenido y de cards/tablas. |

### Colores de anotación
| Variable | Rol |
|----------|-----|
| `--brand-annotation-red` | Fondo de los callouts numerados sobre screenshots y de los `legend-num`. |
| `--brand-annotation-orange` | Color de anotación alternativo (suele coincidir con el primario). |

### Escala de grises (100 claro → 900 oscuro)
`--brand-grey-100`, `-200`, `-300`, `-400`, `-500`, `-600`, `-800`, `-900`.
Usos clave: `-200` fondos suaves (header de tabla, placeholder, borde superior del footer),
`-300` fondo de referencia del `body` y bordes, `-400` bordes punteados y dashed,
`-500`/`-600` textos e íconos deshabilitados/placeholder.

### Colores semánticos
| Variable | Rol |
|----------|-----|
| `--brand-success` | Verde (estado ok). |
| `--brand-warning` | Ámbar (advertencia). |
| `--brand-error` | Rojo (error). |
| `--brand-info` | Azul (info-box, íconos informativos). |

### Tipografía y layout
| Variable | Valor de referencia | Rol |
|----------|--------------------|-----|
| `--font-main` | p. ej. `'Roboto', system-ui, -apple-system, 'Segoe UI', sans-serif` | Tipografía global. |
| `--slide-padding` | `64px 80px` | Padding interior de las slides. |

> Nota de genericización: el template original incluía `--letter-padding`; se **elimina**
> porque no hay formato carta. Los fondos translúcidos derivados de un color (fondos de
> info-box, tip-box, objective-icon) se expresan abajo como "color X a N% de opacidad"
> para que deriven del branding, no como rgba fijos.

---

## 2. Reset y base

- `*, *::before, *::after`: `box-sizing: border-box; margin:0; padding:0;`
- `html`: `font-family: var(--font-main)`, `font-size:16px`, antialiasing
  (`-webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;`),
  `scroll-behavior:smooth`.
- `body`: `background: var(--brand-grey-300)`; `color: var(--brand-text)`;
  `line-height:1.6`; **`counter-reset: slide-counter;`** (contador de páginas).
- `img`: `max-width:100%; height:auto; display:block;`

---

## 3. Slide base y footer

### `.slide`
Contenedor base de cada slide. `position:relative`; `background:var(--brand-surface)`;
`overflow:hidden`; **`counter-increment: slide-counter;`** (numera cada slide).
Las dimensiones reales las fija `.format-slide .slide` (§16).

### `.slide__footer`
Barra inferior fija, presente en TODAS las slides.
`position:absolute; bottom:0; left:0; right:0;` `padding:12px 40px;`
`display:flex; justify-content:space-between; align-items:center;`
`font-size:13px;` `color:var(--brand-text-secondary);`
`border-top:1px solid var(--brand-grey-200);`

- `.slide__footer-left`: `display:flex; align-items:center; gap:6px;`
- `.slide__footer-right::after`: `content: counter(slide-counter);` (imprime el número de página).

En cover y divider el footer invierte a texto/borde claros sobre el fondo de color
(ver §4 y §6).

---

## 4. Slide COVER (`.slide--cover`)

Portada con gradiente de marca a pantalla completa.

- `.slide--cover`: fondo `linear-gradient(135deg, var(--brand-primary-dark) 0%, var(--brand-primary) 45%, var(--brand-primary-light) 100%)`;
  `color:#fff`; `display:flex; align-items:center;`
- `.slide--cover .slide__footer`: `border-top-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.6);`

### Layout de contenido
- `.cover-content`: `display:flex; justify-content:space-between; align-items:center; width:100%; gap:60px;`
- `.cover-text`: `flex:0 0 45%;`
- `.cover-mockup`: `flex:0 0 50%;`

### Textos de portada
- `.cover-logo`: `font-size:42px; font-weight:700; letter-spacing:2px; margin-bottom:48px;`
- `.cover-subtitle`: `font-size:16px; font-weight:400; letter-spacing:3px; text-transform:uppercase; opacity:0.8; margin-bottom:12px;`
- `.cover-title`: `font-size:56px; font-weight:700; line-height:1.1; margin-bottom:8px;`
- `.cover-app-name`: `font-size:28px; font-weight:300; opacity:0.85; margin-bottom:32px;`
- `.cover-version`: `font-size:14px; font-weight:400; opacity:0.6;`

### Mockup (marco del screenshot)
- `.cover-mockup-frame`: `border-radius:12px; padding:12px; background:rgba(0,0,0,0.25);`
- `.cover-mockup-screen`: `border-radius:6px; aspect-ratio:16/9; display:flex; align-items:center; justify-content:center; overflow:hidden;`
- `.cover-mockup-screen img`: `width:100%; height:100%; object-fit:cover;`

---

## 5. Marca de agua del ícono del módulo (`.module-icon-bg`)

Ícono gigante translúcido de fondo, en cover y divider.
- `.module-icon-bg`: `position:absolute; top:0; left:0; bottom:0; width:55%; overflow:hidden; pointer-events:none; display:flex; align-items:center; justify-content:center;`
- `.module-icon-bg .material-symbols-rounded`: `font-size:580px; color:rgba(255,255,255,0.05); font-variation-settings:'FILL' 1;`
- `.slide--divider .module-icon-bg`: `display:none;` (en divider se declara pero se oculta).

---

## 6. Slide DIVIDER (`.slide--divider`)

Separador de sección centrado, fondo de color claro de marca.
- `.slide--divider`: `background:var(--brand-primary-light); color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;`
- `.slide--divider .slide__footer`: `border-top-color: rgba(255,255,255,0.12); color: rgba(255,255,255,0.5);`
- `.divider-icon-wrap`: círculo `width:88px; height:88px; border-radius:50%; background:rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; margin-bottom:24px;`
- `.divider-icon-wrap .material-symbols-rounded`: `font-size:44px; color:#fff;`
- `.divider-title`: `font-size:42px; font-weight:600; letter-spacing:-0.5px;`

---

## 7. Slide OBJECTIVES (`.slide--objectives`)

Lista vertical centrada de 3 objetivos.
- `.slide--objectives`: `display:flex; flex-direction:column; justify-content:center;`
- `.objectives-title`: `font-size:36px; font-weight:700; color:var(--brand-text); margin-bottom:48px; text-align:center;`
- `.objectives-list`: `display:flex; flex-direction:column; gap:36px; max-width:900px; margin:0 auto;`
- `.objective-item`: `display:flex; align-items:flex-start; gap:24px;`
- `.objective-icon`: círculo `width:56px; height:56px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center;` fondo = **primario a 8% de opacidad**.
- `.objective-icon .material-symbols-rounded`: `font-size:28px; color:var(--brand-primary);`
- `.objective-text h3`: `font-size:18px; font-weight:700; color:var(--brand-text); margin-bottom:4px;`
- `.objective-text p`: `font-size:16px; color:var(--brand-text-secondary); line-height:1.5;`

---

## 8. Slide INDEX (`.slide--index`)

Índice a 2 columnas.
- `.slide--index`: `display:flex; flex-direction:column; justify-content:center;`
- `.index-title`: `font-size:36px; font-weight:700; color:var(--brand-text); margin-bottom:40px; text-align:center;`
- `.index-columns`: **multicolumna** `columns:2; column-gap:80px; max-width:960px; margin:0 auto; width:100%;`
- `.index-item`: `display:flex; justify-content:space-between; align-items:baseline; padding:8px 0; border-bottom:1px dotted var(--brand-grey-400); font-size:16px; break-inside:avoid;`
- `.index-item-title`: `color:var(--brand-text);`
- `.index-item-title.is-section`: `font-weight:600; color:var(--brand-primary);` (títulos de sección).
- `.index-item-page`: `color:var(--brand-primary); font-weight:500; min-width:30px; text-align:right;`
- `.index-bullet`: `color:var(--brand-text-secondary); padding-left:12px;` (subtemas indentados).

---

## 9. Slide CONTENT (`.slide--content`)

Slide de contenido general.
- `.slide--content`: `display:flex; flex-direction:column; justify-content:flex-start;`
- `.content-title`: `font-size:32px; font-weight:700; color:var(--brand-text); margin-bottom:20px;`
- `.content-description`: `font-size:17px; color:var(--brand-text-secondary); line-height:1.7; margin-bottom:28px; max-width:none;`
- `.content-description strong`: `color:var(--brand-text); font-weight:600;`

### Split texto + visual (45% / 55%)
- `.content-split`: `display:flex; gap:48px; align-items:flex-start; flex:1;`
- `.content-split__text`: `flex:0 0 45%; padding-top:8px;`
- `.content-split__visual`: `flex:1;`

---

## 10. Screenshots

### Contenedor simple
- `.screenshot-container`: `position:relative; border-radius:8px; overflow:hidden;`
- `.screenshot-container img`: `width:100%; display:block;`

### Placeholder (sin captura)
- `.screenshot-placeholder`: `background:var(--brand-grey-200); border:2px dashed var(--brand-grey-400); border-radius:8px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:32px; min-height:280px;`
- `.screenshot-placeholder .material-symbols-rounded`: `font-size:48px; color:var(--brand-grey-500); margin-bottom:12px;`
- `.screenshot-placeholder__label`: `font-size:14px; color:var(--brand-grey-600); margin-bottom:4px;`
- `.screenshot-placeholder__filename`: `font-size:12px; color:var(--brand-grey-500); font-family:monospace;`

### Screenshot anotado con callouts
- `.annotated-screenshot`: `position:relative; border-radius:8px; overflow:hidden; max-width:85%; margin:0 auto;`
- `.annotated-screenshot img`: `width:100%; display:block;`
- `.callout-num`: punto numerado posicionado en `%` sobre la imagen. Círculo
  `width:28px; height:28px; border-radius:50%;` `background:var(--brand-annotation-red);`
  `color:#fff; font-size:13px; font-weight:700;` `display:flex; align-items:center; justify-content:center;`
  `border:2px solid #fff;` **`transform:translate(-50%,-50%);`** (los `top/left` inline apuntan al centro);
  `z-index:2; position:absolute;`

### Leyenda de anotaciones
- `.annotation-legend`: `list-style:none; columns:2; column-gap:48px; margin-top:36px; font-size:13px; color:var(--brand-text-secondary);`
- `.annotation-legend.cols-3`: `columns:3;` (para >4 items).
- `.annotation-legend li`: `display:flex; align-items:baseline; gap:8px; line-height:1.45; padding:4px 0; break-inside:avoid;`
- `.annotation-legend .legend-num`: círculo pequeño `width:20px; height:20px; border-radius:50%; background:var(--brand-annotation-red); color:#fff; font-size:10px; font-weight:700; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; position:relative; top:2px;`

---

## 11. Info-box y tip-box

Cajas con borde izquierdo de color. Máx 2 por slide (regla dura).
- `.info-box`: `display:flex; gap:14px; padding:18px 22px;` fondo = **info a 6% de opacidad**;
  `border-left:4px solid var(--brand-info); border-radius:0 6px 6px 0; margin:20px 0; font-size:15px; line-height:1.5; color:var(--brand-text);`
- `.info-box .material-symbols-rounded`: `color:var(--brand-info); font-size:22px; flex-shrink:0; margin-top:1px;`
- `.tip-box`: idéntica estructura pero fondo = **primario a 6% de opacidad** y `border-left:4px solid var(--brand-primary);`
- `.tip-box .material-symbols-rounded`: `color:var(--brand-primary); font-size:22px; flex-shrink:0; margin-top:1px;`

---

## 12. Comparación responsiva (`.responsive-comparison`)

Tres marcos de dispositivo lado a lado, escalados por ancho.
- `.responsive-comparison`: `display:flex; gap:20px; align-items:flex-start; margin:16px 0;`
- `.responsive-comparison__item`: `display:flex; flex-direction:column; align-items:center; gap:8px;`
- Proporciones de ancho: `--desktop { flex:3; }`, `--tablet { flex:1.8; }`, `--mobile { flex:1; }`.
- `.responsive-comparison__label`: `font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:1px; color:var(--brand-primary); display:flex; align-items:center; gap:4px;`
- `.responsive-comparison__label .material-symbols-rounded`: `font-size:16px;`
- `.responsive-comparison__frame`: `border-radius:6px; overflow:hidden; width:100%;`
- `.responsive-comparison__frame img`: `width:100%; display:block;`

---

## 13. Feature list (`.feature-list`)

- `.feature-list`: `list-style:none; margin:16px 0;`
- `.feature-list li`: `display:flex; gap:12px; align-items:flex-start; padding:10px 0; font-size:15px; color:var(--brand-text); line-height:1.55;`
- `.feature-list li .material-symbols-rounded`: `font-size:20px; color:var(--brand-primary); margin-top:2px; flex-shrink:0;`

---

## 14. Data table (`.data-table`)

- `.data-table`: `width:100%; border-collapse:collapse; font-size:14.5px; margin:16px 0;`
- `.data-table th`: `text-align:left; padding:12px 16px; background:var(--brand-grey-200); font-weight:600; color:var(--brand-text); border-bottom:2px solid var(--brand-grey-300);`
- `.data-table td`: `padding:12px 16px; border-bottom:1px solid var(--brand-grey-200); color:var(--brand-text-secondary); line-height:1.45;`
- `.data-table td:first-child`: `font-weight:500; color:var(--brand-text);`

---

## 15. Status dot (`.status-dot`)

Punto de color inline para estados.
- `.status-dot`: `display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:6px; vertical-align:middle;`
- Modificadores (mapear a los tokens semánticos, no a hex fijos):
  - `.status-dot--error` → `background:var(--brand-error);`
  - `.status-dot--primary` → `background:var(--brand-primary);`
  - `.status-dot--info` → `background:var(--brand-info);`
  - `.status-dot--success` → `background:var(--brand-success);`
  - `.status-dot--inactive` → `background:var(--brand-grey-500);`

---

## 16. Formato slide (landscape)

Fija las dimensiones reales de cada slide. El `<body>` lleva `class="format-slide"`.
- `.format-slide .slide`: `min-height:100vh; padding:var(--slide-padding); padding-bottom:52px; margin-bottom:4px;`
- `.format-slide .slide--cover`: `padding:60px 80px 52px;`
- `.format-slide .slide--divider`: `padding:0;`

---

## 17. Estilos de impresión (`@media print`) y `@page`

Clave para que el PDF salga una slide por página sin cortes.
- `body`: `background:white;`
- `.slide`: `break-after:page; break-inside:avoid; page-break-after:always; page-break-inside:avoid; overflow:hidden; margin:0; box-shadow:none; border-radius:0;`
- `.slide:last-child`: `break-after:auto; page-break-after:auto;`
- `.format-slide .slide`: `height:100vh;`
- `.screenshot-placeholder`: `border:1px solid #ccc;`
- Forzar impresión de fondos: `-webkit-print-color-adjust:exact !important; print-color-adjust:exact !important;`
- `@page { margin:0; }`

---

## Inventario rápido de clases (checklist de regeneración)

`.slide`, `.slide__footer`, `.slide__footer-left`, `.slide__footer-right::after`,
`.slide--cover`, `.cover-content`, `.cover-text`, `.cover-mockup`, `.cover-logo`,
`.cover-subtitle`, `.cover-title`, `.cover-app-name`, `.cover-version`,
`.cover-mockup-frame`, `.cover-mockup-screen`, `.module-icon-bg`,
`.slide--divider`, `.divider-icon-wrap`, `.divider-title`,
`.slide--objectives`, `.objectives-title`, `.objectives-list`, `.objective-item`,
`.objective-icon`, `.objective-text`,
`.slide--index`, `.index-title`, `.index-columns`, `.index-item`,
`.index-item-title`, `.is-section`, `.index-item-page`, `.index-bullet`,
`.slide--content`, `.content-title`, `.content-description`, `.content-split`,
`.content-split__text`, `.content-split__visual`,
`.screenshot-container`, `.screenshot-placeholder`, `.screenshot-placeholder__label`,
`.screenshot-placeholder__filename`,
`.annotated-screenshot`, `.callout-num`, `.annotation-legend`, `.cols-3`, `.legend-num`,
`.info-box`, `.tip-box`,
`.responsive-comparison`, `.responsive-comparison__item` (`--desktop`/`--tablet`/`--mobile`),
`.responsive-comparison__label`, `.responsive-comparison__frame`,
`.feature-list`,
`.data-table`,
`.status-dot` (`--error`/`--primary`/`--info`/`--success`/`--inactive`),
`.format-slide`.
