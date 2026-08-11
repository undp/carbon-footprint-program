import inventuresLogo from "@/assets/logos/inventures.svg";
import swedenLogo from "@/assets/logos/sweden.svg";
import undpLogo from "@/assets/logos/undp.svg";

/**
 * Institutional partners shown on the public surfaces (header, footer and the
 * "Sobre la iniciativa" screen).
 *
 * Each country deployment has its own set of partners: who funds, who leads
 * and who develops the platform can change. That is why the names, roles and
 * artwork live here and are not embedded in the components.
 *
 * The files under `src/assets/logos/` shipped in the repository are
 * placeholders; each deployment must replace them with the partner's
 * official artwork before going live.
 */
export const PartnerId = {
  SWEDEN: "SWEDEN",
  UNDP: "UNDP",
  INVENTURES: "INVENTURES",
} as const;

export type PartnerId = (typeof PartnerId)[keyof typeof PartnerId];

export interface Partner {
  /** Partner name; used as the logo's alt text. */
  name: string;
  /** Logo file URL resolved by Vite. */
  logoSrc: string;
  /**
   * Partner role in two lines, as it accompanies the logo in the header and
   * the footer (e.g. "Financiada por el" / "Gobierno de Suecia").
   */
  roleCaption: readonly [string, string];
  /**
   * Partner's corporate color. Only used to accent blocks that speak about
   * that particular partner (borders, titles), never for elements of the
   * Huella Latam brand.
   */
  brandColor: string;
}

export const PARTNERS: Record<PartnerId, Partner> = {
  [PartnerId.SWEDEN]: {
    name: "Gobierno de Suecia",
    logoSrc: swedenLogo,
    roleCaption: ["Con el apoyo de", "Suecia"],
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
