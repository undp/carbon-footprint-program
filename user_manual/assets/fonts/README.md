# Fuentes locales del manual

Los capítulos se sirven sin ninguna dependencia de red: estas fuentes se cargan
por `@font-face` desde `../manual.css`. Así un capítulo es una carpeta portable
—se abre y se exporta a PDF sin internet— y la tipografía del PDF no depende de
lo que esté instalado en la máquina que lo genera.

**No agregues hojas de estilo remotas a un capítulo.** Si necesitas un ícono que
no está en el subconjunto, regenéralo con el comando de abajo.

## Archivos

| Archivo                                    | Familia                  | Contenido                                     |
| ------------------------------------------ | ------------------------ | --------------------------------------------- |
| `material-symbols-rounded-subset.woff2`    | Material Symbols Rounded | Solo los 63 íconos que usan los capítulos     |
| `roboto-{latin,latin-ext}-{300…700}.woff2` | Roboto                   | Una instancia estática por peso y subconjunto |

Material Symbols es **variable** y conserva sus cuatro ejes (`FILL`, `GRAD`,
`opsz`, `wght`), de modo que `font-variation-settings: "FILL" 1` sigue
funcionando en la marca de agua de la portada.

Roboto, en cambio, va en **instancias estáticas** —10 archivos: los pesos 300,
400, 500, 600 y 700 en los subconjuntos `latin` y `latin-ext`— y eso es
deliberado. Chromium no puede incrustar una instancia de fuente variable como
programa de fuente en el PDF: la convierte en **Type 3**, es decir contornos como
procedimientos de dibujo, y como el exportador arma una página por lámina y
luego las fusiona, esa conversión se repite en cada página. Medido sobre los
cinco capítulos:

| Roboto                        | PDFs (5 capítulos) | Fuentes incrustadas        |
| ----------------------------- | ------------------ | -------------------------- |
| variable (`wght@300..700`)    | 11.4 MB            | 118 Type 3, 3 CID TrueType |
| instancias estáticas (actual) | 8.0 MB             | 62 CID TrueType, 20 Type 3 |

Los 114 KB extra que cuestan los archivos estáticos ahorran 3.2 MB de binario
versionado y dejan la capa de texto del PDF con subconjuntos de fuente reales.
**No vuelvas a la fuente variable de Roboto.**

## Licencia

Ambas familias son de Google y se distribuyen bajo **Apache License 2.0**, cuyo
texto se incluye en `LICENSE-Apache-2.0.txt` según lo exige la licencia al
redistribuir. Esto es independiente de la licencia del repositorio
(AGPL-3.0-only).

- Material Symbols — https://github.com/google/material-design-icons
- Roboto — https://github.com/googlefonts/roboto

## Regenerar

El subconjunto de íconos se pide a la API de Google Fonts con `icon_names`, así
que el archivo solo trae los glifos en uso. La lista se deriva de los propios
capítulos, no se mantiene a mano:

```bash
cd user_manual

# 1. Los íconos que realmente aparecen en los capítulos.
ICONS=$(grep -ohP '(?<=aria-hidden="true")>[^<]+' */*.html \
  | sed 's/^>//' | sort -u | paste -sd,)

# 2. La hoja de estilo (una UA moderna es necesaria para obtener woff2).
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
curl -s -A "$UA" \
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=$ICONS" \
  -o /tmp/ms.css

# 3. El woff2 que esa hoja referencia.
curl -s -A "$UA" "$(grep -oP 'url\(\K[^)]+' /tmp/ms.css)" \
  -o assets/fonts/material-symbols-rounded-subset.woff2
```

Roboto rara vez cambia. Si hay que rehacerlo, **pide un peso a la vez**: con un
solo valor en `wght` la API devuelve una instancia estática, mientras que con un
rango o una lista (`wght@300..700`, `wght@300;400`) devuelve la fuente variable,
que es justo lo que hay que evitar.

```bash
for w in 300 400 500 600 700; do
  curl -s -A "$UA" "https://fonts.googleapis.com/css2?family=Roboto:wght@$w" -o /tmp/r.css
  # de /tmp/r.css, baja el woff2 de los bloques /* latin */ y /* latin-ext */ a
  # assets/fonts/roboto-<subconjunto>-$w.woff2 y copia su unicode-range a manual.css
done
```

Para comprobar que quedaron estáticas: una fuente estática no tiene tabla `fvar`.

```bash
python3 -c "
from fontTools.ttLib import TTFont   # pip install fonttools brotli
import glob
for p in sorted(glob.glob('assets/fonts/roboto-*.woff2')):
    print(p, 'variable' if 'fvar' in TTFont(p) else 'estática')"
```

Después de regenerar, confirma que ningún ícono quedó fuera del subconjunto: un
glifo ausente se renderiza como su nombre en texto, y un ícono correcto mide
exactamente `1em` de ancho.
