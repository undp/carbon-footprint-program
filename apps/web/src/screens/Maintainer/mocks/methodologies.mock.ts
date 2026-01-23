import type { Methodology } from "../types";

export const mockMethodologies: Methodology[] = [
  {
    id: "1",
    nombre: "GHG Protocol Corporate",
    descripcion:
      "Estándar corporativo para la contabilidad y reporte de gases de efecto invernadero.",
    normativa: "GHG Protocol",
    version: "2024.1",
    activo: true,
  },
  {
    id: "2",
    nombre: "ISO 14064-1",
    descripcion:
      "Especificación con orientación para la cuantificación y el informe de emisiones de GEI a nivel organizacional.",
    normativa: "ISO 14064",
    version: "2023.2",
    activo: false,
  },
  {
    id: "3",
    nombre: "PAS 2050 Producto",
    descripcion:
      "Evaluación de las emisiones de gases de efecto invernadero del ciclo de vida de bienes y servicios.",
    normativa: "PAS 2050",
    version: "2022.1",
    activo: false,
  },
];

export const createEmptyMethodology = (): Methodology => ({
  id: crypto.randomUUID(),
  nombre: "",
  descripcion: "",
  normativa: "GHG Protocol",
  version: "",
  activo: false,
});
