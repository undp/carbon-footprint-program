/**
 * Content of the "Material complementario" screen.
 *
 * The resources are UNDP publications and courses that frame the project.
 * A country deployment can add or replace resources by editing this list.
 */

export const RESOURCES_HERO = {
  title: "Material complementario",
  lead: "Este proyecto se enmarca en el diagnóstico del PNUD sobre la necesidad de contar con herramientas tecnológicas que ayuden a los programas nacionales de huella de carbono a implementarse, y que faciliten a los países el acceso a los cálculos y al otorgamiento de reconocimientos. Estos recursos permiten conocer ese marco en profundidad.",
} as const;

/** Resource type; determines the cover style. */
export const ResourceKind = {
  PUBLICATION: "PUBLICATION",
  COURSE: "COURSE",
} as const;

export type ResourceKind = (typeof ResourceKind)[keyof typeof ResourceKind];

export interface SupportingResource {
  kind: ResourceKind;
  /** Label of the resource type shown above the title. */
  typeLabel: string;
  /** Responsible institution, printed on the cover. */
  coverKicker: string;
  /** Short title that appears inside the cover. */
  coverTitle: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
}

export const SUPPORTING_RESOURCES: readonly SupportingResource[] = [
  {
    kind: ResourceKind.PUBLICATION,
    typeLabel: "Publicación",
    coverKicker: "PNUD · Climate Promise",
    coverTitle:
      "Guía para la implementación de Programas Nacionales Voluntarios de Huella de Carbono",
    title:
      "Guía para la implementación de Programas Nacionales Voluntarios de Huella de Carbono en América Latina",
    description:
      "Publicación del PNUD que consolida las experiencias y lecciones aprendidas de los programas de la región y entrega lineamientos para que los países diseñen e implementen sus propios programas nacionales voluntarios de huella de carbono.",
    ctaLabel: "Descargar la guía",
    href: "https://climatepromise.undp.org/es/research-and-reports/guia-para-la-implementacion-de-programas-nacionales-voluntarios-de-huella-de",
  },
  {
    kind: ResourceKind.COURSE,
    typeLabel: "Curso e-learning",
    coverKicker: "Learning for Nature · PNUD",
    coverTitle:
      "Curso e-learning sobre Programas Nacionales Voluntarios de Huella de Carbono",
    title:
      "Implementación de Programas Nacionales Voluntarios de Huella de Carbono en América Latina",
    description:
      "Curso gratuito y autoguiado en la plataforma Learning for Nature del PNUD, que recorre el diseño, la operación y el escalamiento de un programa nacional voluntario de huella de carbono a partir de la experiencia regional.",
    ctaLabel: "Ir al curso",
    href: "https://www.learningfornature.org/es/courses/implementation-of-national-voluntary-carbon-footprint-programmes-in-latin-america-nvcfp/",
  },
];
