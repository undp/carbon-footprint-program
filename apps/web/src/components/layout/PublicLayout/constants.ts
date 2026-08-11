import { PartnerId } from "@/config/partners";
import type { PartnerLockupStripItem } from "./PartnerLockupStrip";

/**
 * Maximum content width of the public screens, in pixels. Above this width the
 * content is centered and side margins appear.
 */
export const PUBLIC_CONTENT_MAX_WIDTH = 1360;

/**
 * Minimum breathing room, in pixels, between the hero text and the cards that
 * sit over its bottom edge.
 */
export const HERO_OVERLAP_BREATHING_ROOM = 28;

/** Height of the brand gradient band that crowns the public header. */
export const PUBLIC_HEADER_ACCENT_BAR_HEIGHT = 6;

/** Height of the Huella Latam wordmark in the public header, in pixels. */
export const PUBLIC_HEADER_LOGO_HEIGHT = 38;
export const PUBLIC_HEADER_LOGO_WIDTH = 88;

/**
 * Partners that accompany the logo in the header: who funds and who drives the
 * initiative.
 */
export const PUBLIC_HEADER_PARTNERS: readonly PartnerLockupStripItem[] = [
  { partnerId: PartnerId.SWEDEN, logoHeight: 25 },
  { partnerId: PartnerId.UNDP, logoHeight: 46 },
];

/**
 * Footer partners: those in the header plus whoever designs and develops the
 * platform.
 */
export const PUBLIC_FOOTER_PARTNERS: readonly PartnerLockupStripItem[] = [
  { partnerId: PartnerId.SWEDEN, logoHeight: 30 },
  { partnerId: PartnerId.UNDP, logoHeight: 54 },
  { partnerId: PartnerId.INVENTURES, logoHeight: 22 },
];
