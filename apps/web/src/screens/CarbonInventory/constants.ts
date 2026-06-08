export const INCOMPLETE_SOURCES_TOOLTIP =
  "Hay fuentes de emisión incompletas; el total solo considera las completadas.";

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
