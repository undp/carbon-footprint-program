import administratorLogoSrc from "@/assets/logos/gobierno-rd-medio-ambiente.png";
import markContrastSrc from "@/assets/logos/huella-rd-mark-white.png";
import markSrc from "@/assets/logos/huella-rd-mark.png";

/**
 * How the deployment names and signs itself on screen.
 *
 * Each country runs the platform under the name of its own national program
 * and under the institution that administers it, so the wordmark, its clipped
 * form and the artwork live here instead of being spelled out in the
 * components that render them.
 *
 * The artwork under `src/assets/logos/` is the official Huella de Carbono
 * República Dominicana mark: the fingerprint of the Ministerio de Medio
 * Ambiente y Recursos Naturales with the leaf inside it. `markSrc` is the
 * full-color version for light surfaces; `markContrastSrc` is the white
 * silhouette used over the brand gradient and the dark surfaces.
 */
export const BRAND = {
  /** Full name of the platform, as it heads the public pages. */
  name: "Huella de Carbono República Dominicana",
  /**
   * First line of the wordmark lockup. The territory below it completes the
   * name, so this line is never used on its own.
   */
  wordmarkName: "Huella de Carbono",
  /** Second line of the wordmark lockup, set in spaced small caps. */
  wordmarkTerritory: "República Dominicana",
  /** Clipped form, for running text and surfaces too narrow for the full name. */
  shortName: "Huella de Carbono RD",
  /** Institution that administers the platform. */
  administrator: "Ministerio de Medio Ambiente y Recursos Naturales",
  /** Sentence that signs the institutional footer. */
  administratorStatement:
    "Plataforma administrada por el Ministerio de Medio Ambiente y Recursos Naturales de la República Dominicana",
  markSrc,
  markContrastSrc,
  /**
   * Lockup of the Gobierno de la República Dominicana for the administering
   * ministry. White artwork, so it only ever sits on the navy footer.
   */
  administratorLogoSrc,
  administratorLogoAlt:
    "Gobierno de la República Dominicana — Medio Ambiente y Recursos Naturales",
} as const;
