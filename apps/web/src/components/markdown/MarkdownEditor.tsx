import { ReactNode } from "react";
import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
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

const editorContainerSx: SxProps<Theme> = {
  display: "flex",
  flexDirection: "row",
  gap: 2,
  width: "100%",
  "& .w-md-editor": {
    flex: 1,
    minWidth: 0,
    backgroundColor: "background.paper",
    color: "text.primary",
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 1,
    boxShadow: "none",
  },
  "& .w-md-editor-toolbar": {
    backgroundColor: "background.paper",
    borderBottom: "1px solid",
    borderColor: "divider",
  },
  "& .w-md-editor-toolbar li > button": {
    color: "text.primary",
  },
  "& .w-md-editor-text, & .w-md-editor-text-pre, & .w-md-editor-text-input": {
    color: "text.primary",
    backgroundColor: "background.paper",
  },
  "& .w-md-editor-input textarea::placeholder": {
    color: "text.secondary",
  },
};

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
