import {
  AccountBalanceOutlined,
  FactoryOutlined,
  ForumOutlined,
  GroupsOutlined,
  LightbulbOutlined,
  PublicOutlined,
  type SvgIconComponent,
} from "@mui/icons-material";

/**
 * Content of the "Agradecimientos" screen: the people who took part in
 * interviews, working sessions, user testing and validations.
 *
 * The list comes from the project's research log. When adding or correcting
 * people, just edit the groups: the per-group counters and the total are
 * derived from these lists.
 */

/** Pixels the stats band rises to mount over the hero. */
export const RESEARCH_STATS_OVERLAP = 116;

export const ACKNOWLEDGEMENTS_HERO = {
  title: "Agradecimientos",
  lead: "Huella Latam fue diseñada escuchando a quienes viven la medición de huella de carbono día a día. Gracias a las personas de gobiernos, programas nacionales, empresas, consultoras y oficinas del PNUD que participaron en entrevistas, sesiones de trabajo, pruebas de usuario y validaciones. Esta plataforma también es suya.",
} as const;

export interface Participant {
  name: string;
  /** Organization or role they participated with. */
  organization: string;
}

export interface ParticipantGroup {
  title: string;
  Icon: SvgIconComponent;
  participants: readonly Participant[];
}

const toParticipants = (
  entries: readonly (readonly [string, string])[]
): readonly Participant[] =>
  entries.map(([name, organization]) => ({ name, organization }));

export const PARTICIPANT_GROUPS: readonly ParticipantGroup[] = [
  {
    title: "Consultores y expertos",
    Icon: LightbulbOutlined,
    participants: toParticipants([
      ["Pablo Zúñiga", "Consultor independiente"],
      ["Miguel Rescalvo", "Nayen Consulting"],
      ["Marcos Alfaro", "ImplementaSur"],
      ["Sofía Martínez", "ImplementaSur"],
      ["Gabriela Quintana", "Cyclo"],
      ["Luciano Reyes", "Cyclo"],
      ["Alejandro Campusano", "Cyclo"],
      ["Hilany Buchelli", "Libélula (Perú)"],
      ["Javier Perla", "SGS (Perú)"],
      ["David Lezcano", "Alwa (Perú)"],
      ["Richard Gonzales", "AENOR (Perú)"],
      ["Fernando Álamos", "Eco-opera"],
      ["Andrés Morales", "NBC PUCV"],
      ["Fernando Medina", "Huella Smart"],
      ["Alexandra Davidsson", "Climate Hero"],
      ["Jorge Miranda", "Consultor externo"],
    ]),
  },
  {
    title: "Programas nacionales y gobiernos",
    Icon: AccountBalanceOutlined,
    participants: toParticipants([
      ["Arturo Espinoza", "Huella Chile · Ministerio del Medio Ambiente"],
      ["Nataly Moyano", "Huella Chile"],
      ["Rogelio Campos", "Huella Perú · MINAM"],
      ["Evita Mendoza", "Huella Perú"],
      ["Gabriela Márquez", "MARN, República Dominicana"],
      ["Carlos Taveras", "Ministerio de Medio Ambiente, Rep. Dominicana"],
      ["Luz Alcántara", "Dirección de Cambio Climático, Rep. Dominicana"],
      ["Katherine García", "MARN — Equipo TI, Rep. Dominicana"],
      ["Jorge Peña", "MARN — Equipo TI, Rep. Dominicana"],
      ["Raymer Ortiz", "MARN — Equipo TI, Rep. Dominicana"],
      ["Lisandra Rodríguez", "MARN, República Dominicana"],
      ["Fausto Hernández", "MARN, República Dominicana"],
      ["Elizabeth Gómez", "MARN, República Dominicana"],
      ["María Elizabeth Jiménez", "MARN, República Dominicana"],
      [
        "Pamela Abreu",
        "Consejo Nacional para el Cambio Climático, Rep. Dominicana",
      ],
      [
        "Sara González",
        "Consejo Nacional para el Cambio Climático, Rep. Dominicana",
      ],
      ["Carlos López", "Equipo TI, Gobierno de Ecuador"],
      ["Lizeth Yáñez", "Equipo TI, Gobierno de Ecuador"],
      ["Gabriela Santa María", "Gobierno de Panamá"],
      ["Cilinia Simeone", "Gobierno de Panamá"],
    ]),
  },
  {
    title: "Empresas y organizaciones entrevistadas",
    Icon: FactoryOutlined,
    participants: toParticipants([
      ["Evelyn Stevens", "Colbún (Chile)"],
      ["Marisol Rojas", "Ripley (Chile)"],
      ["Cristián Riffo", "Sodimac (Chile)"],
      ["Valeria Oteíza", "CCU (Chile)"],
      ["Tomás Fehlandt", "CCU (Chile)"],
      ["Francisca Varela", "Blue Express (Chile)"],
      ["Nataly Córdova", "Blue Express (Chile)"],
      ["Sebastián Martínez", "Galilea (Chile)"],
      ["Juan Pablo Oyarzún", "C3D (Chile)"],
      ["David García", "Credicorp (Perú)"],
      ["Carlos Adrianzén", "UNACEM (Perú)"],
      ["José Manuel Rivadeneira", "Celepsa (Perú)"],
      ["Ernesto Ortiz", "Celepsa (Perú)"],
      ["Ángela Rodríguez", "ISA (Perú)"],
      ["Yuliana Aguayo", "TPG (Ecuador)"],
      ["Beatriz Marianela", "Cemex (Panamá)"],
    ]),
  },
  {
    title: "PNUD — oficinas de país y equipos regionales",
    Icon: PublicOutlined,
    participants: toParticipants([
      ["Valeria Correa", "PNUD"],
      ["Lorenzo Eguren", "PNUD Perú · Huella Perú"],
      ["Jessica Young", "PNUD Panamá"],
      ["Deyanira González", "PNUD Panamá"],
      ["Carla Muñoz", "PNUD Ecuador"],
      ["Christián López", "PNUD Ecuador"],
      ["José Arroyo", "PNUD Ecuador"],
      ["Karin Obritzhauser", "PNUD República Dominicana"],
      ["Pierre Candelon", "PNUD República Dominicana"],
      ["Fernando Villalobos", "PNUD"],
      ["Ana Isabel De Santos", "PNUD"],
      ["Aparna Bhushan", "PNUD"],
      ["Reina Otsuka", "PNUD — Digital for Planet"],
      ["Gianluca Merlo", "PNUD"],
      ["Michel Nolan", "PNUD — Digital for Planet"],
      ["Vu Hang Dung", "PNUD — Digital for Planet"],
      ["Natalia Aquilino", "PNUD"],
      ["Fernando Andrade", "PNUD · Huella Perú"],
    ]),
  },
  {
    title: "Equipo consultor del proyecto",
    Icon: GroupsOutlined,
    participants: toParticipants([
      ["Kevin Johnson", "Inventures"],
      ["Alexander Hazbún", "Inventures"],
      ["Constanza Urzúa", "Inventures"],
      ["Josefina Hidalgo", "Inventures"],
      ["Juan Francisco Risopatrón", "Inventures"],
      ["Matías Rivas", "Inventures"],
      ["Luis Aparicio", "Inventures"],
      ["Marcelo Saldías", "Inventures"],
      ["Nicolás Alegría", "Inventures"],
      ["Felipe Manríquez", "Consultor externo"],
    ]),
  },
];

/** Total acknowledged people, derived from the groups. */
export const TOTAL_PARTICIPANTS = PARTICIPANT_GROUPS.reduce(
  (total, group) => total + group.participants.length,
  0
);

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
