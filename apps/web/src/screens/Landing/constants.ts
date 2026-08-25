import { VOCAB } from "@/config/vocab";

const ORGANIZATION = VOCAB.organization.noun.singular;
const FOOTPRINT = VOCAB.carbonInventory.noun.singular;

/**
 * Copy of the landing, as the Ministerio de Medio Ambiente y Recursos
 * Naturales worded it.
 *
 * It lives apart from the components because it is the part of the screen a
 * deployment rewrites: the two doors into the platform are the same everywhere,
 * how a country names and explains them is not.
 */
export const LANDING_COPY = {
  welcome: "Te damos la bienvenida a",
  tagline: `Mide, reporta y gestiona la ${FOOTPRINT} de tu ${ORGANIZATION}.`,
  optionsHeading: "¿Qué deseas hacer?",
  explore: {
    title: "Conoce tu Huella",
    description: `Realiza una primera aproximación de las emisiones de tu ${ORGANIZATION}, sin necesidad de registrarte ni almacenar tus datos.`,
    action: `Calcular mi ${VOCAB.carbonInventory.shortNoun.singular}`,
  },
  manage: {
    title: "Gestiona tu Huella",
    description: `Registra los datos de tu ${ORGANIZATION}, genera reportes automáticos y participa en la fase piloto del sistema de reconocimientos.`,
    action: `Gestionar mi ${VOCAB.carbonInventory.shortNoun.singular}`,
    /** Sets the expectation that this door goes through the identity provider. */
    helper: "Te llevaremos a iniciar sesión o a registrar tu cuenta.",
  },
} as const;
