# Fuentes locales del manual

Los capítulos se sirven sin ninguna dependencia de red: estas fuentes se cargan
por `@font-face` desde `../manual.css`. Así un capítulo es una carpeta portable
—se abre y se exporta a PDF sin internet— y la tipografía del PDF no depende de
lo que esté instalado en la máquina que lo genera.

**No agregues hojas de estilo remotas a un capítulo.** Si necesitas un ícono que
no está en el subconjunto, regenéralo con el comando de abajo.

## Archivos

| Archivo                                 | Familia                  | Contenido                                              |
| --------------------------------------- | ------------------------ | ------------------------------------------------------ |
| `material-symbols-rounded-subset.woff2` | Material Symbols Rounded | Solo los 63 íconos que usan los capítulos              |
| `roboto-latin.woff2`                    | Roboto                   | Subconjunto `latin`                                    |
| `roboto-latin-ext.woff2`                | Roboto                   | Subconjunto `latin-ext` (acentos y caracteres latinos) |

Las tres son fuentes variables. Material Symbols conserva sus cuatro ejes
(`FILL`, `GRAD`, `opsz`, `wght`), de modo que `font-variation-settings: "FILL" 1`
sigue funcionando; Roboto conserva el eje `wght`.

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

Roboto rara vez cambia. Si hay que rehacerlo, pide
`https://fonts.googleapis.com/css2?family=Roboto:wght@300..700` con la misma UA
y baja los woff2 de los bloques `/* latin */` y `/* latin-ext */`, copiando su
`unicode-range` a `manual.css`.

Después de regenerar, confirma que ningún ícono quedó fuera del subconjunto: un
glifo ausente se renderiza como su nombre en texto, y un ícono correcto mide
exactamente `1em` de ancho.
