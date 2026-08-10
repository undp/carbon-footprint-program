import { PartnerId } from "@/config/partners";
import type { PartnerLockupStripItem } from "./PartnerLockupStrip";

/**
 * Ancho máximo del contenido de las pantallas públicas, en píxeles. Sobre este
 * ancho el contenido se centra y aparecen márgenes laterales.
 */
export const PUBLIC_CONTENT_MAX_WIDTH = 1360;

/**
 * Aire mínimo, en píxeles, entre el texto del hero y las tarjetas que se
 * montan sobre su borde inferior.
 */
export const HERO_OVERLAP_BREATHING_ROOM = 28;

/** Alto de la franja de degradado de marca que corona el header público. */
export const PUBLIC_HEADER_ACCENT_BAR_HEIGHT = 6;

/** Alto del logotipo de Huella Latam en el header público, en píxeles. */
export const PUBLIC_HEADER_LOGO_HEIGHT = 38;
export const PUBLIC_HEADER_LOGO_WIDTH = 88;

/**
 * Socios que acompañan al logo en el header: quién financia y quién impulsa la
 * iniciativa.
 */
export const PUBLIC_HEADER_PARTNERS: readonly PartnerLockupStripItem[] = [
  { partnerId: PartnerId.SWEDEN, logoHeight: 25 },
  { partnerId: PartnerId.UNDP, logoHeight: 46 },
];

/**
 * Socios del pie de página: los del header más quien diseña y desarrolla la
 * plataforma.
 */
export const PUBLIC_FOOTER_PARTNERS: readonly PartnerLockupStripItem[] = [
  { partnerId: PartnerId.SWEDEN, logoHeight: 30 },
  { partnerId: PartnerId.UNDP, logoHeight: 54 },
  { partnerId: PartnerId.INVENTURES, logoHeight: 22 },
];
