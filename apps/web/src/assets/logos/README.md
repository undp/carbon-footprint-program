# Logos de socios

Los archivos de esta carpeta se consumen desde `src/config/partners.ts` y se
renderizan con `<PartnerLogo />` en el header público, el pie de página público
y la pantalla "Sobre la iniciativa".

> **Importante:** `undp.svg`, `sweden.svg` e `inventures.svg` son **marcadores de
> posición** dibujados a mano para que el layout tenga las proporciones
> correctas. No son la marca oficial de cada socio. Antes de publicar, cada
> despliegue debe reemplazar estos archivos por el arte oficial que le entregue
> el socio correspondiente, respetando la relación de aspecto declarada en
> `PARTNERS` (`src/config/partners.ts`).

Para reemplazarlos basta con sobrescribir el archivo manteniendo el nombre; no
hay que tocar código. Si el arte oficial tiene otra relación de aspecto, ajusta
`aspectRatio` en `PARTNERS` para que las alturas del diseño sigan calzando.

Formatos aceptados: SVG (preferido) o PNG con fondo transparente. Los SVG se
cargan como `<img>`, por lo que deben ser autocontenidos y usar únicamente
familias tipográficas del sistema (`Helvetica, Arial, sans-serif`).
