import { format } from "date-fns";
import { es } from "date-fns/locale";

interface BuildCarbonInventoryZipReadmeInput {
  inventoryName: string | null;
  year: number | null;
  generatedAt: Date;
}

export function buildCarbonInventoryZipReadme({
  inventoryName,
  year,
  generatedAt,
}: BuildCarbonInventoryZipReadmeInput): string {
  const headerName = inventoryName?.trim() || "sin nombre";
  const headerYear = year ?? "sin año";
  const generated = format(generatedAt, "d 'de' MMMM 'de' yyyy, HH:mm", {
    locale: es,
  });

  return `Huella de carbono — ${headerName} (${headerYear})
Generado: ${generated}

IMPORTANTE
Este archivo contiene únicamente información de las líneas con
emisiones calculadas. Una línea queda sin completar cuando le falta
algún dato necesario para calcularlas: cantidad, unidad, fuente del
factor o valor del factor. En el modo manual, una subcategoría queda
sin completar mientras no se haya ingresado su total de emisiones.

Si esperabas ver una línea o una subcategoría aquí y no la
encuentras, regresa al inventario, completa los datos faltantes y
vuelve a descargar.

Contenido:

- resumen-emisiones.xlsx
  Resumen detallado de emisiones, con desglose por categoría,
  subcategoría y línea. La columna "Item ID" identifica cada línea
  y se corresponde con el segmento "item-{id}" de los archivos en
  la carpeta archivos/.

- metodologia.xlsx
  Metodología aplicada al inventario (categorías, subcategorías,
  factores de emisión).

- archivos/
  Archivos de respaldo adjuntos a cada línea calculada del
  inventario.
`;
}
