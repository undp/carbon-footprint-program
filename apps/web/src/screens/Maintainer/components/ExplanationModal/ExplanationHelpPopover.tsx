import { FC } from "react";
import { Box, Popover, Typography } from "@mui/material";
import {
  CheatsheetEntry,
  EXTRA_CHEATSHEET_ENTRIES,
  TOOLBAR_ACTIONS,
} from "./constants";

interface ExplanationHelpPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

const TOOLBAR_CHEATSHEET_ENTRIES: ReadonlyArray<CheatsheetEntry> =
  TOOLBAR_ACTIONS.flatMap((action) =>
    action.cheatsheetSyntax
      ? [{ label: action.label, syntax: action.cheatsheetSyntax }]
      : []
  );

interface CheatsheetSectionProps {
  title: string;
  entries: ReadonlyArray<CheatsheetEntry>;
}

const CheatsheetSection: FC<CheatsheetSectionProps> = ({ title, entries }) => (
  <Box sx={{ mt: 2, "&:first-of-type": { mt: 0 } }}>
    <Typography
      variant="overline"
      sx={{ display: "block", color: "text.secondary", mb: 0.5 }}
    >
      {title}
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
      {entries.map((entry) => (
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
              whiteSpace: "pre-line",
            }}
          >
            {entry.syntax}
          </Typography>
        </Box>
      ))}
    </Box>
  </Box>
);

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
    <Box sx={{ p: 2, maxWidth: 420 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Sintaxis de Markdown
      </Typography>
      <CheatsheetSection
        title="Atajos en la barra"
        entries={TOOLBAR_CHEATSHEET_ENTRIES}
      />
      <CheatsheetSection
        title="Más sintaxis disponible"
        entries={EXTRA_CHEATSHEET_ENTRIES}
      />
    </Box>
  </Popover>
);
