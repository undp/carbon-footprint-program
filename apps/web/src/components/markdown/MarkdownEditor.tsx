import { ReactNode } from "react";
import { Box } from "@mui/material";
import { alpha, type SxProps, type Theme } from "@mui/material/styles";
import MDEditor from "@uiw/react-md-editor";
import { ExplanationContent } from "@/components/ExplanationContent";
import {
  DEFAULT_MARKDOWN_EDITOR_HEIGHT,
  DEFAULT_MARKDOWN_EDITOR_PLACEHOLDER,
  MARKDOWN_EDITOR_TOOLBAR_COMMANDS,
} from "./constants";

interface MarkdownEditorProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  height?: number;
  minHeight?: number;
  renderPreview?: (value: string) => ReactNode;
}

// `@uiw/react-md-editor` drives its text/background/toolbar colors through CSS
// custom properties defined in the sibling `@uiw/react-markdown-preview`
// package. That package's stylesheet is not imported here, so we surface the
// variables ourselves from the MUI theme to keep colors consistent.
const editorContainerSx: SxProps<Theme> = (theme) => ({
  display: "flex",
  flexDirection: "row",
  gap: 2,
  width: "100%",
  "--color-fg-default": theme.palette.text.primary,
  "--color-canvas-default": theme.palette.background.paper,
  "--color-border-default": theme.palette.divider,
  "--color-neutral-muted": alpha(theme.palette.text.primary, 0.08),
  "--color-accent-fg": theme.palette.primary.main,
  "--color-danger-fg": theme.palette.error.main,
  "& .w-md-editor": {
    flex: 1,
    minWidth: 0,
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 1,
    boxShadow: "none",
  },
  "& .w-md-editor-toolbar": {
    borderBottom: "1px solid",
    borderColor: "divider",
  },
  "& .w-md-editor-input textarea::placeholder": {
    color: "text.secondary",
  },
});

const MarkdownEditor = ({
  value,
  onChange,
  placeholder = DEFAULT_MARKDOWN_EDITOR_PLACEHOLDER,
  disabled = false,
  height = DEFAULT_MARKDOWN_EDITOR_HEIGHT,
  minHeight,
  renderPreview,
}: MarkdownEditorProps) => {
  const previewNode = renderPreview ? (
    renderPreview(value)
  ) : (
    <ExplanationContent content={value} />
  );

  return (
    <Box data-color-mode="light" sx={editorContainerSx}>
      <MDEditor
        value={value}
        onChange={(next) => onChange(next ?? "")}
        preview="edit"
        hideToolbar={false}
        visibleDragbar={false}
        height={height}
        minHeight={minHeight}
        commands={MARKDOWN_EDITOR_TOOLBAR_COMMANDS}
        extraCommands={[]}
        textareaProps={{
          placeholder,
          disabled,
        }}
      />
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          height,
          minHeight,
          overflow: "auto",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          backgroundColor: "background.paper",
          px: 2,
          py: 1.5,
        }}
      >
        {previewNode}
      </Box>
    </Box>
  );
};

export default MarkdownEditor;
