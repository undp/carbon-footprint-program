import { useQuery } from "@tanstack/react-query";
import { STALE_TIME_MS } from "@/config/constants";
import { methodologyKeys } from "./keys";

export interface Subcategory {
  id: string;
  name: string;
  description?: string;
  examples?: string;
}

export interface Category {
  id: string;
  name: string;
  synonyms: string;
  description: string;
  examples: string;
  order: number;
  subcategories: Subcategory[];
}

export interface Methodology {
  id: string;
  name: string;
  categories: Category[];
}

const MOCK_METHODOLOGY: Methodology = {
  id: "1",
  name: "Metodología CR 2026",
  categories: [
    {
      id: "537",
      name: "Alcance 1",
      synonyms: "Emisiones directas",
      description:
        "Emisiones provenientes de fuentes que son propiedad o están controladas por la organización.",
      examples: "Combustión en calderas, hornos, vehículos, etc.",
      order: 1,
      subcategories: [
        {
          id: "1531",
          name: "Combustión estacionaria",
          description:
            "Emisiones por combustión de combustibles en equipos fijos.",
          examples: "Calderas, generadores, hornos.",
        },
        {
          id: "1533",
          name: "Combustiones móviles",
          description:
            "Emisiones por combustión de combustibles en equipos de transporte.",
          examples: "Automóviles, camiones, montacargas.",
        },
        {
          id: "1535",
          name: "Emisiones fugitivas",
          description:
            "Liberaciones no intencionales de gases de efecto invernadero.",
          examples: "Fugas de refrigerantes en aire acondicionado.",
        },
        {
          id: "1537",
          name: "Procesos industriales",
          description: "Emisiones de procesos químicos o físicos.",
          examples: "Producción de cemento, industria química.",
        },
        {
          id: "1539",
          name: "Tratamiento de aguas",
          description:
            "Emisiones derivadas del tratamiento de aguas residuales in situ.",
          examples: "Plantas de tratamiento anaeróbicas.",
        },
        {
          id: "1541",
          name: "Uso de fertilizantes",
          description:
            "Emisiones por aplicación de fertilizantes nitrogenados.",
          examples: "Mantenimiento de jardines o campos agrícolas.",
        },
        {
          id: "1543",
          name: "Generadores de emergencia",
          description: "Combustión en equipos de respaldo eléctrico.",
          examples: "Plantas eléctricas diesel.",
        },
        {
          id: "1545",
          name: "Extintores de incendios",
          description: "Emisiones por uso o fuga de agentes extintores.",
          examples: "Cargas de CO2 o HFC.",
        },
        {
          id: "1547",
          name: "Procesos agrícolas",
          description: "Emisiones por actividades de labranza o ganadería.",
          examples: "Fermentación entérica.",
        },
        {
          id: "1549",
          name: "Equipos de soldadura",
          description:
            "Emisiones por gases utilizados en procesos de soldadura.",
          examples: "Acetileno, CO2.",
        },
      ],
    },
    {
      id: "849",
      name: "Alcance 2",
      synonyms: "Emisiones indirectas por energía",
      description:
        "Emisiones derivadas de la generación de electricidad, vapor, calefacción o refrigeración consumidos por la organización.",
      examples: "Electricidad comprada a la red nacional.",
      order: 2,
      subcategories: [
        {
          id: "1890",
          name: "Electricidad de la red",
          description:
            "Consumo de energía eléctrica del Sistema Eléctrico Nacional.",
          examples: "Iluminación, equipos de oficina.",
        },
        {
          id: "1892",
          name: "Consumo de vapor",
          description: "Energía térmica adquirida a terceros.",
          examples: "Vapor para procesos industriales.",
        },
        {
          id: "1894",
          name: "Calefacción distrital",
          description:
            "Energía para calefacción proveniente de una red urbana.",
          examples: "Sistemas de calefacción centralizados externos.",
        },
        {
          id: "1896",
          name: "Refrigeración distrital",
          description: "Energía para enfriamiento adquirida externamente.",
          examples: "Sistemas de agua helada distritales.",
        },
        {
          id: "1898",
          name: "Carga de flota eléctrica",
          description:
            "Electricidad utilizada para cargar vehículos eléctricos de la empresa.",
          examples: "Estaciones de carga internas.",
        },
        {
          id: "1900",
          name: "Iluminación perimetral",
          description:
            "Consumo eléctrico de luminarias en áreas comunes externas.",
          examples: "Postes de luz en estacionamientos.",
        },
        {
          id: "1902",
          name: "Bombeo de agua",
          description: "Consumo eléctrico para el movimiento de fluidos.",
          examples: "Bombas de agua potable o pluvial.",
        },
        {
          id: "1904",
          name: "Salas de servidores",
          description: "Energía consumida por centros de datos o racks.",
          examples: "Servidores, UPS, refrigeración de IT.",
        },
        {
          id: "1906",
          name: "Ascensores y montacargas",
          description: "Consumo eléctrico de sistemas de transporte vertical.",
          examples: "Motores de ascensores.",
        },
        {
          id: "1908",
          name: "Sistemas de ventilación",
          description: "Energía para renovación de aire mecánica.",
          examples: "Extractores e inyectores de aire.",
        },
      ],
    },
    {
      id: "900",
      name: "Alcance 3",
      synonyms: "Otras emisiones indirectas",
      description:
        "Emisiones que son consecuencia de las actividades de la organización, pero ocurren en fuentes que no son propiedad ni están controladas por ella.",
      examples: "Viajes de negocios, transporte de insumos.",
      order: 3,
      subcategories: [
        {
          id: "2001",
          name: "Viajes de negocios",
          description:
            "Transporte de colaboradores por motivos laborales en medios externos.",
          examples: "Vuelos comerciales, taxis.",
        },
        {
          id: "2003",
          name: "Desplazamiento al trabajo",
          description:
            "Traslado de empleados desde su hogar hacia el centro de trabajo.",
          examples: "Autobuses, trenes, vehículos particulares.",
        },
        {
          id: "2005",
          name: "Transporte de insumos",
          description: "Logística de entrada de materiales y materias primas.",
          examples: "Fletes de proveedores.",
        },
        {
          id: "2007",
          name: "Distribución de productos",
          description:
            "Transporte de productos vendidos hacia el cliente final.",
          examples: "Servicios de mensajería, logística de terceros.",
        },
        {
          id: "2009",
          name: "Residuos ordinarios",
          description: "Emisiones por la disposición final de basura común.",
          examples: "Rellenos sanitarios.",
        },
        {
          id: "2011",
          name: "Residuos peligrosos",
          description:
            "Tratamiento y disposición de desechos con características especiales.",
          examples: "Incineración de residuos químicos.",
        },
        {
          id: "2013",
          name: "Bienes adquiridos",
          description:
            "Emisiones incorporadas en la producción de insumos comprados.",
          examples: "Compra de papel, suministros de oficina.",
        },
        {
          id: "2015",
          name: "Activos arrendados",
          description: "Operación de equipos o espacios alquilados a terceros.",
          examples: "Oficinas en coworking.",
        },
        {
          id: "2017",
          name: "Servicios de nube",
          description: "Consumo energético de infraestructura IT externa.",
          examples: "AWS, Azure, Google Cloud.",
        },
        {
          id: "2019",
          name: "Inversiones",
          description:
            "Emisiones asociadas a la cartera de inversiones de la organización.",
          examples: "Participaciones en otras empresas.",
        },
      ],
    },
  ],
};

export const useMethodology = (carbonInventoryId: string) => {
  return useQuery<Methodology>({
    queryKey: methodologyKeys.detail(carbonInventoryId),
    queryFn: async () => {
      // Simulando una llamada a la API
      return new Promise((resolve) => {
        setTimeout(() => resolve(MOCK_METHODOLOGY), 500);
      });
    },
    staleTime: STALE_TIME_MS,
    enabled: !!carbonInventoryId,
  });
};
