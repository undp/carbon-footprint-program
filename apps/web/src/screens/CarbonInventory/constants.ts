export const INCOMPLETE_SOURCES_TOOLTIP =
  "Hay fuentes de emisión incompletas; el total solo considera las completadas.";

/**
 * Shown before a year change is applied to a footprint that already has
 * declared lines. Each emission factor is valid only for the year it declares,
 * so the frozen catalogue factors of every line are removed and the lines ask
 * for a factor again. The copy has to be explicit about what is lost and what
 * survives, because nothing marks the cleared lines afterwards beyond coming
 * back without a factor.
 */
export const YEAR_CHANGE_DIALOG_CONTENT = {
  title: "¿Cambiar el año de la huella?",
  message:
    "Las fuentes de emisión que usan un factor del catálogo quedarán sin factor y tendrás que asignarles uno nuevamente, porque los factores son válidos para un solo año.",
  description:
    "Las cantidades, las unidades y las variables de cada fuente de emisión se mantienen, y los factores que ingresaste manualmente quedan tal como están.",
  confirmLabel: "Cambiar el año",
  cancelLabel: "Mantener el año actual",
} as const;

export const EXIT_DIALOG_CONTENT = {
  LOGGED_IN: {
    title: "¿Salir sin guardar?",
    description: "Los cambios realizados no serán guardados.",
    confirmLabel: "Salir sin guardar",
  },
  GUEST: {
    title: "¿Quieres salir?",
    description:
      "Si sales ahora perderás todos tus datos. Continúa hasta el paso final y regístrate para guardar tu inventario de carbono.",
    confirmLabel: "Salir",
  },
} as const;
