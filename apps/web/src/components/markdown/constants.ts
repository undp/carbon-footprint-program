import { commands } from "@uiw/react-md-editor";
import type { ICommand } from "@uiw/react-md-editor";

export const DEFAULT_MARKDOWN_EDITOR_HEIGHT = 480;

export const DEFAULT_MARKDOWN_EDITOR_PLACEHOLDER =
  "Escribe la explicación en Markdown...";

export const MARKDOWN_EDITOR_TOOLBAR_COMMANDS: ICommand[] = [
  commands.bold,
  commands.italic,
  commands.title,
  commands.divider,
  commands.unorderedListCommand,
  commands.orderedListCommand,
  commands.divider,
  commands.link,
  commands.code,
  commands.codeBlock,
  commands.quote,
];
