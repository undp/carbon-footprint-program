import {
  FactoryOutlined,
  ForumOutlined,
  GroupsOutlined,
  PublicOutlined,
  type SvgIconComponent,
} from "@mui/icons-material";
import { BRAND } from "@/config/brand";
import { TOTAL_PARTICIPANTS } from "./participants";

/**
 * Editorial content of the "Agradecimientos" screen: hero copy, the
 * research-process figures and the closing footnote.
 *
 * The acknowledged people themselves live in `participants.ts` — that is the
 * single place to add or correct names. See
 * `docs/development/public-pages-content.md` for the editing guide.
 */

/** Pixels the stats band rises to mount over the hero. */
export const RESEARCH_STATS_OVERLAP = 116;

export const ACKNOWLEDGEMENTS_HERO = {
  title: "Agradecimientos",
  lead: `${BRAND.name} se construye sobre Huella Latam, diseñada escuchando a quienes viven la medición de huella de carbono día a día. Gracias a las personas de gobiernos, programas nacionales, empresas, consultoras y oficinas del PNUD que participaron en entrevistas, sesiones de trabajo, pruebas de usuario y validaciones. Esta plataforma también es suya.`,
} as const;

/**
 * Research-process figures. The sessions, the countries and the
 * organizations are data from the project's log and cannot be derived
 * from the list of people; the participant total can.
 */
export const RESEARCH_SESSIONS_LABEL = "+70";
export const RESEARCH_COUNTRIES_LABEL = "5";
export const RESEARCH_ORGANIZATIONS_LABEL = "+40";

export interface ResearchStat {
  value: string;
  label: string;
  /** Decorative icon that peeks out from the card's corner. */
  Icon: SvgIconComponent;
}

/** Figures for the research-process band, mounted over the hero's edge. */
export const RESEARCH_STATS: readonly ResearchStat[] = [
  {
    value: RESEARCH_SESSIONS_LABEL,
    label: "sesiones de entrevistas y validación",
    Icon: ForumOutlined,
  },
  {
    value: String(TOTAL_PARTICIPANTS),
    label: "personas participantes",
    Icon: GroupsOutlined,
  },
  {
    value: RESEARCH_COUNTRIES_LABEL,
    label: "países de la región",
    Icon: PublicOutlined,
  },
  {
    value: RESEARCH_ORGANIZATIONS_LABEL,
    label: "organizaciones involucradas",
    Icon: FactoryOutlined,
  },
];

/** Footnote about the origin of the list and how to request corrections. */
export const ACKNOWLEDGEMENTS_FOOTNOTE =
  "Listado elaborado a partir del registro de entrevistas y sesiones de validación del proyecto (julio 2025 – marzo 2026). Si participaste del proceso y no apareces en esta lista, o quieres corregir tu nombre u organización, escríbenos para actualizarlo.";
