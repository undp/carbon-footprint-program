import { commands } from "@uiw/react-md-editor";
import type { ICommand } from "@uiw/react-md-editor";

export const DEFAULT_MARKDOWN_EDITOR_HEIGHT = 480;

export const DEFAULT_MARKDOWN_EDITOR_PLACEHOLDER =
  "Escribe la explicación en Markdown...";

export const MARKDOWN_EDITOR_TOOLBAR_COMMANDS: ICommand[] = [
  commands.bold,
  commands.italic,
  commands.title,
  commands.heading1,
  commands.heading2,
  commands.heading3,
  commands.heading4,
  commands.heading5,
  commands.heading6,
  commands.divider,
  commands.unorderedListCommand,
  commands.orderedListCommand,
  commands.divider,
  commands.link,
  commands.code,
  commands.codeBlock,
  commands.quote,
  commands.image,
  commands.codeEdit,
  commands.codeLive,
  commands.codePreview,
  commands.fullscreen,
  commands.help,
  commands.issue,
  commands.table,
  commands.checkedListCommand,
];

export const MARKDOWN_EDITOR_TAB = {
  EDIT: "edit",
  PREVIEW: "preview",
} as const;

export type MarkdownEditorTab =
  (typeof MARKDOWN_EDITOR_TAB)[keyof typeof MARKDOWN_EDITOR_TAB];

export const MARKDOWN_EDITOR_TAB_LABEL: Record<MarkdownEditorTab, string> = {
  [MARKDOWN_EDITOR_TAB.EDIT]: "Edición",
  [MARKDOWN_EDITOR_TAB.PREVIEW]: "Vista previa",
};
