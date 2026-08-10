import inventuresLogo from "@/assets/logos/inventures.svg";
import swedenLogo from "@/assets/logos/sweden.svg";
import undpLogo from "@/assets/logos/undp.svg";

/**
 * Socios institucionales que se muestran en las superficies públicas (header,
 * pie de página y pantalla "Sobre la iniciativa").
 *
 * Cada despliegue de país tiene su propia constelación de socios: quién
 * financia, quién lidera y quién desarrolla la plataforma puede cambiar. Por
 * eso los nombres, los roles y el arte viven acá y no incrustados en los
 * componentes.
 *
 * Los archivos de `src/assets/logos/` que vienen en el repositorio son
 * marcadores de posición; el arte oficial de cada socio debe reemplazarlos
 * antes de publicar (ver `src/assets/logos/README.md`).
 */
export const PartnerId = {
  SWEDEN: "SWEDEN",
  UNDP: "UNDP",
  INVENTURES: "INVENTURES",
} as const;

export type PartnerId = (typeof PartnerId)[keyof typeof PartnerId];

export interface Partner {
  /** Nombre del socio; se usa como texto alternativo del logo. */
  name: string;
  /** URL del archivo de logo resuelta por Vite. */
  logoSrc: string;
  /**
   * Rol del socio en dos líneas, tal como acompaña al logo en el header y en
   * el pie de página (p. ej. "Financiada por el" / "Gobierno de Suecia").
   */
  roleCaption: readonly [string, string];
  /**
   * Color corporativo del socio. Solo se usa para acentuar bloques que hablan
   * de ese socio en particular (bordes, títulos), nunca para elementos de la
   * marca Huella Latam.
   */
  brandColor: string;
}

export const PARTNERS: Record<PartnerId, Partner> = {
  [PartnerId.SWEDEN]: {
    name: "Gobierno de Suecia",
    logoSrc: swedenLogo,
    roleCaption: ["Financiada por el", "Gobierno de Suecia"],
    brandColor: "#005293",
  },
  [PartnerId.UNDP]: {
    name: "PNUD",
    logoSrc: undpLogo,
    roleCaption: ["Una iniciativa", "de"],
    brandColor: "#0468B1",
  },
  [PartnerId.INVENTURES]: {
    name: "Inventures",
    logoSrc: inventuresLogo,
    roleCaption: ["Diseño y", "desarrollo"],
    brandColor: "#1C403A",
  },
};
