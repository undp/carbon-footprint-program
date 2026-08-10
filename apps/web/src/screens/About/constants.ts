import {
  AccountBalanceOutlined,
  CheckCircleOutlined,
  CodeOutlined,
  GroupsOutlined,
  PublicOutlined,
  type SvgIconComponent,
} from "@mui/icons-material";
import { CalculatorIcon } from "@/icons";
import { PartnerId } from "@/config/partners";
import type { FC } from "react";
import type { SvgIconProps } from "@mui/material";

/**
 * Contenido editorial de la pantalla "Sobre la iniciativa".
 *
 * Todo lo que un despliegue de país podría querer reescribir —cifras, países,
 * hitos, socios y textos— vive acá, y no repartido por los componentes.
 */

/** Países de la región con un programa nacional de huella de carbono en marcha. */
export const ACTIVE_PROGRAM_COUNTRIES: readonly string[] = [
  "Chile",
  "Perú",
  "Ecuador",
  "Panamá",
];

export interface AboutStat {
  value: string;
  label: string;
}

/** Píxeles que la banda de cifras sube para montarse sobre el hero. */
export const ABOUT_STATS_OVERLAP = 72;

/**
 * Cifras de la banda superior. El número de programas nacionales se deriva de
 * `ACTIVE_PROGRAM_COUNTRIES` para que no se desincronice del listado.
 */
export const ABOUT_STATS: readonly AboutStat[] = [
  {
    value: String(ACTIVE_PROGRAM_COUNTRIES.length),
    label: "programas nacionales ya en marcha en la región",
  },
  { value: "+70", label: "entrevistas de investigación en la región" },
  {
    value: "1,5 °C",
    label: "la meta del Acuerdo de París que orienta el trabajo",
  },
  { value: "100%", label: "código abierto, adaptable por cualquier país" },
];

/** Escenarios del gráfico de calentamiento proyectado de "El desafío". */
export interface WarmingScenario {
  value: string;
  caption: string;
  /** Altura relativa de la barra, entre 0 y 1. */
  barRatio: number;
}

export const WARMING_CHART = {
  overline: "Calentamiento proyectado",
  title: "La meta de 1,5 °C exige actuar ya",
  footnote:
    "Contener el calentamiento a 1,5 °C requiere una transición acelerada hacia economías descarbonizadas.",
  scenarios: [
    { value: "2,4 °C", caption: "Con los compromisos actuales", barRatio: 1 },
    { value: "1,5 °C", caption: "Meta del Acuerdo de París", barRatio: 0.62 },
  ] as readonly WarmingScenario[],
} as const;

export const PRIVATE_SECTOR_CARD = {
  title: "El sector privado es clave",
  body: "Las Contribuciones Determinadas a Nivel Nacional (NDC) son la principal herramienta de política climática de los países. Movilizar al sector privado —desde pymes hasta grandes empresas— es esencial para alinear inversiones y modelos de negocio con las metas del Acuerdo de París.",
  tags: ["Pymes", "Grandes empresas", "Sector público"] as readonly string[],
} as const;

export const REGIONAL_OPPORTUNITY_CARD = {
  overline: "Una oportunidad regional",
  countryStatusLabel: "Programa activo",
  footnote:
    "Una solución regional de código abierto genera economías de escala y reduce los costos de cálculo, verificación y reconocimiento.",
} as const;

export interface PlatformPillar {
  step: string;
  Icon: FC<SvgIconProps>;
  title: string;
  body: string;
  tags: readonly string[];
  /** Llamado a la acción que reemplaza a las etiquetas en el último pilar. */
  callout?: string;
}

export const PLATFORM_PILLARS: readonly PlatformPillar[] = [
  {
    step: "01",
    Icon: CalculatorIcon,
    title: "Medir",
    body: "Cada país configura la metodología que ha adoptado —ISO 14064, GHG Protocol o una combinación— junto con sus propios factores de emisión.",
    tags: ["ISO 14064", "GHG Protocol", "Factores locales"],
  },
  {
    step: "02",
    Icon: CheckCircleOutlined,
    title: "Reportar y verificar",
    body: "Las organizaciones gestionan sus huellas, someten sus mediciones a evaluación y verificación, y acceden a reconocimientos oficiales otorgados por los programas nacionales.",
    tags: ["Evaluación", "Verificación", "Reconocimientos"],
  },
  {
    step: "03",
    Icon: CodeOutlined,
    title: "Compartir como bien público",
    body: "Software de código abierto alineado con los estándares de la Digital Public Goods Alliance y adaptable a cada país de la región.",
    tags: [],
    callout: "¿Te interesa implementarlo en tu país? Contacta al PNUD",
  },
];

export const ALLIANCE_BANNER_TEXT =
  "Una plataforma construida entre quienes financian, diseñan, operan y usan los programas nacionales de huella de carbono.";

export interface AllianceActor {
  role: string;
  name: string;
  description: string;
  /** Socio cuyo logo encabeza la tarjeta. */
  partnerId?: PartnerId;
  /** Ícono que reemplaza al logo en los actores sin marca propia. */
  Icon?: SvgIconComponent;
}

export const ALLIANCE_ACTORS: readonly AllianceActor[] = [
  {
    role: "Lidera e implementa",
    name: "PNUD",
    partnerId: PartnerId.UNDP,
    description:
      "El PNUD impulsa la iniciativa a través de su equipo regional de Clima para América Latina y el Caribe y la Climate Promise, junto a sus oficinas de país.",
  },
  {
    role: "Financia",
    name: "Gobierno de Suecia",
    partnerId: PartnerId.SWEDEN,
    description:
      "El Gobierno de Suecia financia la iniciativa, reafirmando su compromiso con la acción climática y el desarrollo sostenible de la región.",
  },
  {
    role: "Diseña y desarrolla",
    name: "Inventures",
    partnerId: PartnerId.INVENTURES,
    description:
      "Consultora de tecnología e innovación con base en Chile, a cargo de la investigación, el diseño UX/UI y el desarrollo de la plataforma.",
  },
  {
    role: "Operan los programas",
    name: "Gobiernos de la región",
    Icon: AccountBalanceOutlined,
    description:
      "Los programas nacionales de huella de carbono y los gobiernos que desarrollan nuevos programas operan la plataforma en sus países.",
  },
  {
    role: "Miden y reducen",
    name: "Organizaciones y empresas",
    Icon: GroupsOutlined,
    description:
      "Empresas de todos los tamaños, instituciones públicas y organizaciones de la sociedad civil miden, reportan y reducen su huella de carbono.",
  },
];

export interface RoadmapMilestone {
  period: string;
  stage: string;
  title: string;
  description: string;
  /** Los hitos en curso se pintan en ámbar; los cumplidos, en verde. */
  isInProgress: boolean;
}

export const ROADMAP_MILESTONES: readonly RoadmapMilestone[] = [
  {
    period: "2024",
    stage: "Origen",
    title: "Del aprendizaje regional a un producto común",
    description:
      "Tras acompañar los programas de Chile, Perú, Ecuador y Panamá, el PNUD consolidó las lecciones en una guía regional y un curso e-learning.",
    isInProgress: false,
  },
  {
    period: "2025",
    stage: "Investigación",
    title: "Más de 70 entrevistas en toda la región",
    description:
      "Coordinadores de programas nacionales, gobiernos, empresas usuarias, consultores y equipos del PNUD.",
    isInProgress: false,
  },
  {
    period: "2025 – 2026",
    stage: "Desarrollo",
    title: "Construcción del MVP de código abierto",
    description:
      "Calculadora de emisiones, gestión de huellas, verificación, reconocimientos y vistas públicas de transparencia.",
    isInProgress: false,
  },
  {
    period: "2026",
    stage: "Piloto · En curso",
    title: "Piloto con un país seleccionado",
    description:
      "Probando el ciclo completo de medición, verificación y reconocimiento en condiciones reales.",
    isInProgress: true,
  },
  {
    period: "2026",
    stage: "Validación DPG · En curso",
    title: "Validación como Bien Público Digital",
    description:
      "Asegurando que la solución se mantenga abierta, reutilizable y valiosa para toda la región.",
    isInProgress: true,
  },
];

/**
 * Bloque de reconocimiento al socio financista. El nombre del proyecto va en
 * cursiva y entre comillas, por eso el párrafo está partido en dos.
 */
export const FUNDING_HIGHLIGHT = {
  badge: "Socio financista",
  title: "Financiada por el Gobierno de Suecia",
  bodyBeforeProject:
    "Posible gracias al financiamiento del Gobierno de Suecia, en el marco del proyecto del PNUD",
  projectName:
    "Promoviendo la movilización de financiamiento verde en América Latina y el Caribe",
  bodyAfterProject:
    ", que busca acelerar la implementación de las NDC. El compromiso de Suecia hace posible que esta plataforma sea un bien público digital, gratuito y abierto para toda la región.",
} as const;

export interface OrganizationProfile {
  title: string;
  body: string;
  /** Logo del socio que encabeza la tarjeta. */
  partnerId?: PartnerId;
  /** Ícono que reemplaza al logo cuando la tarjeta no representa a un socio. */
  Icon?: SvgIconComponent;
  /** Cifras que acompañan al logo. */
  figures: readonly AboutStat[];
  /** Distintivo que reemplaza a las cifras. */
  badge?: string;
  /** Enlace incrustado al final de `body`, seguido de `bodyAfterLink`. */
  link?: { label: string; href: string };
  bodyAfterLink?: string;
}

export const ORGANIZATION_PROFILES: readonly OrganizationProfile[] = [
  {
    title: "Acerca del PNUD",
    partnerId: PartnerId.UNDP,
    figures: [{ value: "170", label: "países" }],
    body: "El PNUD es la principal agencia de las Naciones Unidas que lucha contra la injusticia de la pobreza, las desigualdades y el cambio climático. Trabajando con una amplia red de expertos y socios en 170 países, el PNUD ayuda a las naciones a desarrollar soluciones integradas y sostenibles por las personas y el planeta. Para obtener más información, visita",
    link: { label: "undp.org/es", href: "https://www.undp.org/es" },
    bodyAfterLink: " o síguenos en las redes sociales vía @PNUD.",
  },
  {
    title: "Acerca de la iniciativa Climate Promise: Forward del PNUD",
    Icon: PublicOutlined,
    figures: [
      { value: "+140", label: "países" },
      { value: "37 M", label: "personas" },
    ],
    body: "A través de la iniciativa Climate Promise, la mayor cartera de apoyo a la acción climática del sistema de las Naciones Unidas, el PNUD trabaja con más de 140 países y territorios y beneficia directamente a 37 millones de personas. La cartera permite ejecutar más de 2.450 millones de dólares de los Estados Unidos en financiación basada en subvenciones y aprovechar la experiencia del PNUD en materia de adaptación, mitigación, mercados de carbono, clima y bosques, riesgo y seguridad climáticos y estrategias y políticas climáticas. Visita nuestro sitio web",
    link: {
      label: "climatepromise.undp.org/es",
      href: "https://climatepromise.undp.org/es",
    },
    bodyAfterLink: " y síguenos en @UNDPplanet.",
  },
  {
    title: "Acerca de IFV LAC",
    partnerId: PartnerId.SWEDEN,
    figures: [],
    badge: "Financiado por ASDI",
    body: "Esta herramienta fue desarrollada en el marco del proyecto Innovación para las Finanzas Verdes en LAC (IFV LAC), financiado por Suecia a través de la Agencia Sueca de Cooperación para el Desarrollo Internacional (ASDI). Esta herramienta no refleja ni compromete el punto de vista de nuestros socios. IFV LAC forma parte de los esfuerzos del PNUD por promover la movilización de financiamiento verde en América Latina y el Caribe, y acelerar la implementación de planes climáticos y ambientales a nivel nacional y regional.",
  },
];

/** Cierre legal de la página, exigido por el convenio de financiamiento. */
export const ABOUT_DISCLAIMER =
  "Esta iniciativa es financiada por el Gobierno de Suecia e implementada por el Programa de las Naciones Unidas para el Desarrollo (PNUD). Los contenidos de esta plataforma son responsabilidad exclusiva de sus autores y no reflejan necesariamente el punto de vista de sus socios.";

export const ABOUT_HERO = {
  badge: "Bien público digital · América Latina y el Caribe",
  title: "Sobre la iniciativa",
  lead: "Huella Latam es un software de código abierto impulsado por el PNUD para apoyar los Programas Nacionales de Huella de Carbono en América Latina y el Caribe. Permite que organizaciones de todos los tamaños midan sus emisiones de gases de efecto invernadero, gestionen sus huellas y sometan sus mediciones a evaluación para obtener reconocimientos oficiales.",
} as const;

export const ABOUT_SECTION_TITLES = {
  challenge: "El desafío",
  platform: "Qué hace la plataforma",
  alliance: "Una alianza regional",
  roadmap: "El camino — dónde estamos",
  organizations: "Quiénes están detrás",
} as const;
