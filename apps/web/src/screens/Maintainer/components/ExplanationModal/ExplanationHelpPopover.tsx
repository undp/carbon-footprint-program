import { FC } from "react";
import { Box, Popover, Typography } from "@mui/material";

interface ExplanationHelpPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

interface CheatsheetEntry {
  label: string;
  syntax: string;
}

const ENTRIES: CheatsheetEntry[] = [
  { label: "Matemática en bloque", syntax: "$$\\frac{a}{b}$$" },
  { label: "Código en línea", syntax: "`código`" },
  { label: "Lista de tareas", syntax: "- [ ] tarea" },
  { label: "Tachado", syntax: "~~texto~~" },
  { label: "Encabezado 4", syntax: "#### Título" },
  { label: "Encabezado 5", syntax: "##### Título" },
  { label: "Autoenlace", syntax: "<https://ejemplo.com>" },
];

export const ExplanationHelpPopover: FC<ExplanationHelpPopoverProps> = ({
  open,
  anchorEl,
  onClose,
}) => (
  <Popover
    open={open}
    anchorEl={anchorEl}
    onClose={onClose}
    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    transformOrigin={{ vertical: "top", horizontal: "right" }}
  >
    <Box sx={{ p: 2, maxWidth: 360 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Sintaxis adicional
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        El editor reconoce más sintaxis de la que muestra la barra. Estos son
        los patrones extra disponibles:
      </Typography>
      <Box
        component="dl"
        sx={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          columnGap: 2,
          rowGap: 0.75,
          m: 0,
        }}
      >
        {ENTRIES.map((entry) => (
          <Box
            key={entry.label}
            sx={{ display: "contents" }}
            role="group"
            aria-label={entry.label}
          >
            <Typography
              component="dt"
              variant="body2"
              sx={{ color: "text.secondary" }}
            >
              {entry.label}
            </Typography>
            <Typography
              component="dd"
              variant="body2"
              sx={{
                m: 0,
                fontFamily: "monospace",
                fontSize: "0.8125rem",
                color: "text.primary",
              }}
            >
              {entry.syntax}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  </Popover>
);
