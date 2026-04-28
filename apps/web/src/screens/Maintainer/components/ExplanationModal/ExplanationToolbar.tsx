import { FC, MouseEvent, useState } from "react";
import {
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import {
  FormatBold,
  FormatItalic,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
  Functions,
  HelpOutline,
  HorizontalRule,
  Link as LinkIcon,
  TableChart,
  Title,
} from "@mui/icons-material";
import { ExplanationHelpPopover } from "./ExplanationHelpPopover";

export interface ToolbarInsertSpec {
  before: string;
  after: string;
  placeholder: string;
  block?: boolean;
}

interface ExplanationToolbarProps {
  onInsert: (spec: ToolbarInsertSpec) => void;
  disabled?: boolean;
}

const TABLE_SNIPPET_BEFORE = "| ";
const TABLE_SNIPPET_AFTER =
  " | col2 | col3 |\n| --- | --- | --- |\n| a | b | c |";

export const ExplanationToolbar: FC<ExplanationToolbarProps> = ({
  onInsert,
  disabled = false,
}) => {
  const [headingAnchor, setHeadingAnchor] = useState<HTMLElement | null>(null);
  const [helpAnchor, setHelpAnchor] = useState<HTMLElement | null>(null);

  const insert = (spec: ToolbarInsertSpec) => {
    if (disabled) return;
    onInsert(spec);
  };

  const insertHeading = (level: 1 | 2 | 3) => {
    setHeadingAnchor(null);
    insert({
      before: `${"#".repeat(level)} `,
      after: "",
      placeholder: `Encabezado ${level}`,
      block: true,
    });
  };

  return (
    <Box
      sx={(theme) => ({
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        flexWrap: "wrap",
        py: 0.5,
        px: 1,
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.default,
      })}
    >
      <Tooltip title="Encabezado">
        <span>
          <IconButton
            size="small"
            disabled={disabled}
            onClick={(event: MouseEvent<HTMLButtonElement>) =>
              setHeadingAnchor(event.currentTarget)
            }
            aria-label="Encabezado"
          >
            <Title fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Menu
        anchorEl={headingAnchor}
        open={headingAnchor !== null}
        onClose={() => setHeadingAnchor(null)}
      >
        <MenuItem onClick={() => insertHeading(1)}>Encabezado 1</MenuItem>
        <MenuItem onClick={() => insertHeading(2)}>Encabezado 2</MenuItem>
        <MenuItem onClick={() => insertHeading(3)}>Encabezado 3</MenuItem>
      </Menu>

      <Tooltip title="Negrita (Ctrl+B)">
        <span>
          <IconButton
            size="small"
            disabled={disabled}
            onClick={() =>
              insert({ before: "**", after: "**", placeholder: "texto" })
            }
            aria-label="Negrita"
          >
            <FormatBold fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Cursiva (Ctrl+I)">
        <span>
          <IconButton
            size="small"
            disabled={disabled}
            onClick={() =>
              insert({ before: "*", after: "*", placeholder: "texto" })
            }
            aria-label="Cursiva"
          >
            <FormatItalic fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Lista">
        <span>
          <IconButton
            size="small"
            disabled={disabled}
            onClick={() =>
              insert({
                before: "- ",
                after: "",
                placeholder: "item",
                block: true,
              })
            }
            aria-label="Lista"
          >
            <FormatListBulleted fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Lista numerada">
        <span>
          <IconButton
            size="small"
            disabled={disabled}
            onClick={() =>
              insert({
                before: "1. ",
                after: "",
                placeholder: "item",
                block: true,
              })
            }
            aria-label="Lista numerada"
          >
            <FormatListNumbered fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Cita">
        <span>
          <IconButton
            size="small"
            disabled={disabled}
            onClick={() =>
              insert({
                before: "> ",
                after: "",
                placeholder: "cita",
                block: true,
              })
            }
            aria-label="Cita"
          >
            <FormatQuote fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Enlace">
        <span>
          <IconButton
            size="small"
            disabled={disabled}
            onClick={() =>
              insert({ before: "[", after: "](url)", placeholder: "texto" })
            }
            aria-label="Enlace"
          >
            <LinkIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Matemática">
        <span>
          <IconButton
            size="small"
            disabled={disabled}
            onClick={() =>
              insert({ before: "$", after: "$", placeholder: "fórmula" })
            }
            aria-label="Matemática"
          >
            <Functions fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Separador">
        <span>
          <IconButton
            size="small"
            disabled={disabled}
            onClick={() =>
              insert({
                before: "---\n",
                after: "",
                placeholder: "",
                block: true,
              })
            }
            aria-label="Separador"
          >
            <HorizontalRule fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Tabla">
        <span>
          <IconButton
            size="small"
            disabled={disabled}
            onClick={() =>
              insert({
                before: TABLE_SNIPPET_BEFORE,
                after: TABLE_SNIPPET_AFTER,
                placeholder: "col1",
                block: true,
              })
            }
            aria-label="Tabla"
          >
            <TableChart fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />

      <Tooltip title="Ayuda">
        <span>
          <IconButton
            size="small"
            onClick={(event: MouseEvent<HTMLButtonElement>) =>
              setHelpAnchor(event.currentTarget)
            }
            aria-label="Ayuda"
          >
            <HelpOutline fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <ExplanationHelpPopover
        open={helpAnchor !== null}
        anchorEl={helpAnchor}
        onClose={() => setHelpAnchor(null)}
      />
    </Box>
  );
};
