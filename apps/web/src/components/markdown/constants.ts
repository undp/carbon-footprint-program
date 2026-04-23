import { commands } from "@uiw/react-md-editor";
import type { ICommand } from "@uiw/react-md-editor";

export const DEFAULT_MARKDOWN_EDITOR_HEIGHT = 520;

export const DEFAULT_MARKDOWN_EDITOR_PLACEHOLDER =
  "Escribe la explicación en Markdown...";

export const MARKDOWN_EDITOR_TOOLBAR_ES_LABELS: Record<
  string,
  { ariaLabel: string; title: string }
> = {
  bold: { ariaLabel: "Negrita", title: "Negrita" },
  italic: { ariaLabel: "Cursiva", title: "Cursiva" },
  strikethrough: { ariaLabel: "Tachado", title: "Tachado" },
  hr: { ariaLabel: "Línea horizontal", title: "Línea horizontal" },
  heading: { ariaLabel: "Encabezado", title: "Encabezado" },
  heading1: { ariaLabel: "Encabezado 1", title: "Encabezado 1" },
  heading2: { ariaLabel: "Encabezado 2", title: "Encabezado 2" },
  heading3: { ariaLabel: "Encabezado 3", title: "Encabezado 3" },
  heading4: { ariaLabel: "Encabezado 4", title: "Encabezado 4" },
  heading5: { ariaLabel: "Encabezado 5", title: "Encabezado 5" },
  heading6: { ariaLabel: "Encabezado 6", title: "Encabezado 6" },
  link: { ariaLabel: "Enlace", title: "Enlace" },
  code: { ariaLabel: "Código en línea", title: "Código en línea" },
  codeBlock: { ariaLabel: "Bloque de código", title: "Bloque de código" },
  quote: { ariaLabel: "Cita", title: "Cita" },
  image: { ariaLabel: "Imagen", title: "Imagen" },
  table: { ariaLabel: "Tabla", title: "Tabla" },
  "unordered-list": { ariaLabel: "Lista", title: "Lista" },
  "ordered-list": { ariaLabel: "Lista numerada", title: "Lista numerada" },
  "checked-list": { ariaLabel: "Lista de tareas", title: "Lista de tareas" },
  edit: { ariaLabel: "Solo edición", title: "Solo edición" },
  live: {
    ariaLabel: "Edición y vista previa",
    title: "Edición y vista previa",
  },
  preview: { ariaLabel: "Solo vista previa", title: "Solo vista previa" },
  fullscreen: { ariaLabel: "Pantalla completa", title: "Pantalla completa" },
  help: { ariaLabel: "Ayuda", title: "Ayuda" },
  issue: { ariaLabel: "Reportar problema", title: "Reportar problema" },
};

export const localizeCommand = (command: ICommand): ICommand => {
  if (!command.name) {
    return command;
  }
  const labels = MARKDOWN_EDITOR_TOOLBAR_ES_LABELS[command.name];
  if (!labels) {
    return command;
  }
  return {
    ...command,
    buttonProps: {
      ...(command.buttonProps ?? {}),
      "aria-label": labels.ariaLabel,
      title: labels.title,
    },
  };
};

const headingPicker: ICommand = commands.group(
  [
    localizeCommand(commands.heading1),
    localizeCommand(commands.heading2),
    localizeCommand(commands.heading3),
    localizeCommand(commands.heading4),
    localizeCommand(commands.heading5),
    localizeCommand(commands.heading6),
  ],
  {
    name: "heading",
    groupName: "heading",
    icon: commands.heading.icon,
    buttonProps: {
      "aria-label": "Encabezado",
      title: "Encabezado",
    },
  }
);

export const MARKDOWN_EDITOR_TOOLBAR_COMMANDS: ICommand[] = [
  localizeCommand(commands.bold),
  localizeCommand(commands.italic),
  localizeCommand(commands.strikethrough),
  localizeCommand(commands.hr),
  commands.divider,
  headingPicker,
  localizeCommand(commands.heading1),
  localizeCommand(commands.heading2),
  localizeCommand(commands.heading3),
  localizeCommand(commands.heading4),
  localizeCommand(commands.heading5),
  localizeCommand(commands.heading6),
  commands.divider,
  localizeCommand(commands.link),
  localizeCommand(commands.code),
  localizeCommand(commands.codeBlock),
  localizeCommand(commands.quote),
  localizeCommand(commands.image),
  localizeCommand(commands.table),
  commands.divider,
  localizeCommand(commands.unorderedListCommand),
  localizeCommand(commands.orderedListCommand),
  localizeCommand(commands.checkedListCommand),
  commands.divider,
  localizeCommand(commands.codeEdit),
  localizeCommand(commands.codeLive),
  localizeCommand(commands.codePreview),
  commands.divider,
  localizeCommand(commands.fullscreen),
  localizeCommand(commands.help),
  localizeCommand(commands.issue),
];
