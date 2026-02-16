import { organizationKeys } from "./keys";
import { STALE_TIME_MS } from "@/config/constants";
import { useQuery } from "@tanstack/react-query";

const MOCK_ORGANIZATION_PROFILE = [
  {
    id: "org-123",
    name: "Cementera del Valle",
    taxId: "76.458.320-1",
    legalName: "Cementera del Valle S.A.",
    tradeName: "Cementera del Valle",
    sector: {
      id: "1",
      name: "Industria manufacturera – Producción de cemento y clinker",
    },
    subsector: {
      id: "1",
      name: "Fabricación de cemento, cal y yeso (CIIU 2394)",
    },
    countryOrganizationSize: {
      id: "1",
      name: "Empresa grande",
    },
    mainActivity: {
      id: "1",
      name: "Producción y despacho de clinker y cemento",
    }, // Agregar ? Y con el cantidad de actividades principales ?
    address: "Camino Industrial 2450, Tiltil, Región Metropolitana, Chile",
    employeeCount: 620,
    representative: {
      name: "Maria Fernanda Rivas Soto",
      taxId: "13.984.562-3",
      position: {
        id: "1",
        name: "Gerenta de Sustentabilidad y Cumplimiento Ambiental",
      },
      email: "mfrivas@cementeradelvalle.cl",
      phone: "+56 9 8354 8700",
    },
  },
  {
    id: "org-456",
    name: "Empresa Ejemplo S.A.",
    taxId: "76.123.456-7",
    legalName: "Empresa Ejemplo S.A.",
    tradeName: "Empresa Ejemplo",
    sector: {
      id: "2",
      name: "Comercio al por mayor y menor; reparación de vehículos automotores y motocicletas",
    },
    subsector: {
      id: "2",
      name: "Comercio al por mayor de maquinaria, equipo y suministros (CIIU 4669)",
    },
    countryOrganizationSize: {
      id: "2",
      name: "Empresa mediana",
    },
    mainActivity: {
      id: "2",
      name: "Comercio al por mayor de maquinaria agrícola",
    },
    address: "Avenida Comercio 1234, Santiago, Región Metropolitana, Chile",
    employeeCount: 150,
    representative: {
      name: "Carlos Eduardo Martínez López",
      taxId: "13.984.562-3",
      position: {
        id: "2",
        name: "Gerente General",
      },
      email: "cemartinez@empresaejemplo.cl",
      phone: "+56 9 8354 8700",
    },
  },
];

//TODO: REPLACE WITH API TYPES
export type Representative = {
  name: string;
  taxId: string;
  position: {
    id: string;
    name: string;
  };
  email: string;
  phone: string;
};

//TODO: REPLACE WITH API TYPES
export interface GetOrganizationResponse {
  id: string;
  name: string;
  tradeName: string;
  taxId: string;
  legalName: string;
  sector: {
    id: string;
    name: string;
  };
  subsector: {
    id: string;
    name: string;
  };
  countryOrganizationSize: {
    id: string;
    name: string;
  };
  mainActivity: {
    id: string;
    name: string;
  };
  address: string;
  employeeCount: number;
  representative: Representative;
}

export const useOrganization = (id: string) =>
  useQuery<GetOrganizationResponse>({
    queryKey: organizationKeys.detail(id),
    // queryFn: () => apiClient.get(`organizations/${id}`).json(),
    queryFn: () =>
      Promise.resolve(MOCK_ORGANIZATION_PROFILE.find((org) => org.id === id)!),
    staleTime: STALE_TIME_MS,
    enabled: !!id,
  });
