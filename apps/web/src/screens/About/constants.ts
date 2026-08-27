import {
  InsertChartOutlined,
  SpeedOutlined,
  TrendingDownOutlined,
  type SvgIconComponent,
} from "@mui/icons-material";
import { PartnerId } from "@/config/partners";
import { BRAND } from "@/config/brand";
import { VOCAB } from "@/config/vocab";

/**
 * Editorial content of the "Sobre la iniciativa" screen, as the Ministerio de
 * Medio Ambiente y Recursos Naturales worded it.
 *
 * Everything a country deployment rewrites —what the initiative is, what the
 * platform does for an organization and who supports it— lives here and not
 * scattered across the components.
 */

const ORGANIZATION = VOCAB.organization.noun.plural;

export const ABOUT_HERO = {
  badge: "Iniciativa nacional",
  title: "Sobre la iniciativa",
  lead: `${BRAND.name} es una iniciativa del ${BRAND.administrator} que facilita a las ${ORGANIZATION} la medición, el reporte y la gestión de sus emisiones de gases de efecto invernadero.`,
} as const;

export const ABOUT_METHODOLOGY_PARAGRAPH = `Mediante una metodología estandarizada, la plataforma permite estimar la ${VOCAB.carbonInventory.noun.singular} ${VOCAB.organization.relationalAdjective}, generar reportes y orientar la identificación de oportunidades para reducir emisiones.`;

export interface AboutBenefit {
  Icon: SvgIconComponent;
  title: string;
  body: string;
}

/** What an organization gets out of the platform, in the order it happens. */
export const ABOUT_BENEFITS: readonly AboutBenefit[] = [
  {
    Icon: SpeedOutlined,
    title: "Mide",
    body: `Calcula las emisiones de tu ${VOCAB.organization.noun.singular} con fuentes y factores de emisión relevantes para tu actividad.`,
  },
  {
    Icon: InsertChartOutlined,
    title: "Reporta",
    body: "Genera reportes claros y comparables para comunicar tus resultados y dar seguimiento a tu desempeño.",
  },
  {
    Icon: TrendingDownOutlined,
    title: "Toma acción",
    body: `Conoce recomendaciones para orientar la reducción de las emisiones de tu ${VOCAB.organization.noun.singular}.`,
  },
];

export const ABOUT_SECTION_TITLES = {
  benefits: "Qué hace la plataforma",
  supporters: "Con el apoyo de",
} as const;

export interface AboutSupporter {
  partnerId: PartnerId;
  /** Logo height in pixels; the width adjusts to keep the proportion. */
  logoHeight: number;
  description: string;
}

/** Who backs the initiative, beyond the ministry that administers it. */
export const ABOUT_SUPPORTERS: readonly AboutSupporter[] = [
  {
    partnerId: PartnerId.SWEDEN,
    logoHeight: 34,
    description:
      "La iniciativa cuenta con el apoyo del Gobierno de Suecia, a través de su cooperación internacional para el desarrollo.",
  },
  {
    partnerId: PartnerId.UNDP,
    logoHeight: 58,
    description:
      "El PNUD impulsa esta iniciativa como parte de su trabajo de acompañamiento a los países en la acción climática y el desarrollo sostenible.",
  },
];

/**
 * Where the software comes from. The ministry asked for this note to be read,
 * not skimmed past, so it closes the screen as a framed block instead of the
 * fine print it used to be.
 */
export const ABOUT_FOUNDATION_NOTE = `${BRAND.name} se construye sobre Huella Latam, un Bien Público Digital impulsado por el PNUD con el apoyo del Gobierno de Suecia y el desarrollo tecnológico de Inventures.`;
