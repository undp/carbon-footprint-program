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
Este resumen refleja lo mismo que ves en pantalla: incluye todas las
líneas y subcategorías activas del inventario, estén completas o
incompletas. Una línea queda incompleta cuando le falta algún dato
necesario para calcular sus emisiones: cantidad, unidad, fuente del
factor o valor del factor. En el modo manual, una subcategoría queda
incompleta mientras no se haya ingresado su total de emisiones.

Las líneas incompletas aparecen sin valor de emisiones. El total de
emisiones solo considera las líneas completas, por lo que puede aumentar
a medida que completes los datos pendientes.

Contenido:

- resumen-emisiones.xlsx
  Resumen detallado de emisiones, con desglose por categoría,
  subcategoría y línea (completas e incompletas). La columna "Item ID"
  identifica cada línea y se corresponde con el segmento "item-{id}" de
  los archivos en la carpeta archivos/.

- metodologia.xlsx
  Metodología aplicada al inventario (categorías, subcategorías,
  factores de emisión).

- archivos/
  Archivos de respaldo adjuntos a las líneas del inventario, tanto
  completas como incompletas.
`;
}
