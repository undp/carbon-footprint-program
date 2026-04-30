import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material";
import {
  FormatBold,
  FormatItalic,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
  FormatUnderlined,
  Functions,
  HorizontalRule,
  Link as LinkIcon,
  StrikethroughS,
  TableChart,
  Title,
} from "@mui/icons-material";

export interface ToolbarInsertSpec {
  before: string;
  after: string;
  placeholder: string;
  block?: boolean;
  multiline?: boolean;
}

export type ToolbarActionId =
  | "heading"
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "list"
  | "numberedList"
  | "quote"
  | "link"
  | "math"
  | "hr"
  | "table";

export interface ToolbarAction {
  id: ToolbarActionId;
  label: string;
  tooltip: string;
  icon: ComponentType<SvgIconProps>;
  spec?: ToolbarInsertSpec;
  shortcut?: { key: "b" | "i" | "u" };
  cheatsheetSyntax?: string;
}

export const TOOLBAR_ACTIONS: ToolbarAction[] = [
  {
    id: "heading",
    label: "Encabezado",
    tooltip: "Encabezado",
    icon: Title,
    cheatsheetSyntax: "## Título",
  },
  {
    id: "bold",
    label: "Negrita",
    tooltip: "Negrita (Ctrl+B)",
    icon: FormatBold,
    spec: { before: "**", after: "**", placeholder: "texto" },
    shortcut: { key: "b" },
    cheatsheetSyntax: "**texto**",
  },
  {
    id: "italic",
    label: "Cursiva",
    tooltip: "Cursiva (Ctrl+I)",
    icon: FormatItalic,
    spec: { before: "*", after: "*", placeholder: "texto" },
    shortcut: { key: "i" },
    cheatsheetSyntax: "*texto*",
  },
  {
    id: "underline",
    label: "Subrayar",
    tooltip: "Subrayar (Ctrl+U)",
    icon: FormatUnderlined,
    spec: { before: "<u>", after: "</u>", placeholder: "texto" },
    shortcut: { key: "u" },
    cheatsheetSyntax: "<u>texto</u>",
  },
  {
    id: "strikethrough",
    label: "Tachar",
    tooltip: "Tachar",
    icon: StrikethroughS,
    spec: { before: "~~", after: "~~", placeholder: "texto" },
    cheatsheetSyntax: "~~texto~~",
  },
  {
    id: "list",
    label: "Lista",
    tooltip: "Lista",
    icon: FormatListBulleted,
    spec: {
      before: "- ",
      after: "",
      placeholder: "item",
      block: true,
      multiline: true,
    },
    cheatsheetSyntax: "- item",
  },
  {
    id: "numberedList",
    label: "Lista numerada",
    tooltip: "Lista numerada",
    icon: FormatListNumbered,
    spec: {
      before: "1. ",
      after: "",
      placeholder: "item",
      block: true,
      multiline: true,
    },
    cheatsheetSyntax: "1. item",
  },
  {
    id: "quote",
    label: "Cita",
    tooltip: "Cita",
    icon: FormatQuote,
    spec: { before: "> ", after: "", placeholder: "cita", block: true },
    cheatsheetSyntax: "> cita",
  },
  {
    id: "link",
    label: "Enlace",
    tooltip: "Enlace",
    icon: LinkIcon,
    spec: { before: "[", after: "](url)", placeholder: "texto" },
    cheatsheetSyntax: "[texto](url)",
  },
  {
    id: "math",
    label: "Matemática",
    tooltip: "Matemática",
    icon: Functions,
    spec: { before: "$", after: "$", placeholder: "fórmula" },
    cheatsheetSyntax: "$fórmula$",
  },
  {
    id: "hr",
    label: "Separador",
    tooltip: "Separador",
    icon: HorizontalRule,
    spec: { before: "---\n", after: "", placeholder: "", block: true },
    cheatsheetSyntax: "---",
  },
  {
    id: "table",
    label: "Tabla",
    tooltip: "Tabla",
    icon: TableChart,
    spec: {
      before: "| ",
      after: " | col2 | col3 |\n| --- | --- | --- |\n| a | b | c |",
      placeholder: "col1",
      block: true,
    },
    cheatsheetSyntax: "| a | b |\n| --- | --- |\n| 1 | 2 |",
  },
];

export const HEADING_LEVELS = [1, 2, 3] as const;

export type HeadingLevel = (typeof HEADING_LEVELS)[number];

export const buildHeadingSpec = (level: HeadingLevel): ToolbarInsertSpec => ({
  before: `${"#".repeat(level)} `,
  after: "",
  placeholder: `Encabezado ${level}`,
  block: true,
});

export interface CheatsheetEntry {
  label: string;
  syntax: string;
}

export const EXTRA_CHEATSHEET_ENTRIES: ReadonlyArray<CheatsheetEntry> = [
  { label: "Matemática en bloque", syntax: "$$\\frac{a}{b}$$" },
  { label: "Código en línea", syntax: "`código`" },
  { label: "Lista de tareas", syntax: "- [ ] tarea" },
  { label: "Encabezado 4", syntax: "#### Título" },
  { label: "Encabezado 5", syntax: "##### Título" },
  { label: "Autoenlace", syntax: "<https://ejemplo.com>" },
];

export const EDITOR_PLACEHOLDER = "Escribe la explicación aquí...";
