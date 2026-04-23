import { SyntheticEvent, useState } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import { alpha, type SxProps, type Theme } from "@mui/material/styles";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import MDEditor from "@uiw/react-md-editor";
import { ExplanationContent } from "@/components/ExplanationContent";
import {
  DEFAULT_MARKDOWN_EDITOR_HEIGHT,
  DEFAULT_MARKDOWN_EDITOR_PLACEHOLDER,
  MARKDOWN_EDITOR_TAB,
  MARKDOWN_EDITOR_TAB_LABEL,
  MARKDOWN_EDITOR_TOOLBAR_COMMANDS,
  type MarkdownEditorTab,
} from "./constants";

interface MarkdownEditorProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  height?: number;
  minHeight?: number;
}

// `@uiw/react-md-editor` drives its text/background/toolbar colors through CSS
// custom properties defined in the sibling `@uiw/react-markdown-preview`
// package. That package's stylesheet is not imported here, so we surface the
// variables ourselves from the MUI theme to keep colors consistent.
const editorContainerSx: SxProps<Theme> = (theme) => ({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  "--color-fg-default": theme.palette.text.primary,
  "--color-canvas-default": theme.palette.background.paper,
  "--color-border-default": theme.palette.divider,
  "--color-neutral-muted": alpha(theme.palette.text.primary, 0.08),
  "--color-accent-fg": theme.palette.primary.main,
  "--color-danger-fg": theme.palette.error.main,
  "& .w-md-editor": {
    width: "100%",
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

const tabsSx: SxProps<Theme> = (theme) => ({
  minHeight: 46,
  borderBottom: `1px solid ${theme.palette.divider}`,
  mb: 1.5,
  "& .MuiTabs-indicator": {
    backgroundColor: theme.palette.primary.main,
    height: 2,
  },
  "& .MuiTab-root": {
    textTransform: "none",
    minHeight: 46,
    fontWeight: 500,
    fontSize: "0.875rem",
    color: theme.palette.text.secondary,
    gap: 1,
    "&.Mui-selected": {
      color: theme.palette.primary.dark,
    },
  },
});

const MarkdownEditor = ({
  value,
  onChange,
  placeholder = DEFAULT_MARKDOWN_EDITOR_PLACEHOLDER,
  height = DEFAULT_MARKDOWN_EDITOR_HEIGHT,
  minHeight,
}: MarkdownEditorProps) => {
  const [activeTab, setActiveTab] = useState<MarkdownEditorTab>(
    MARKDOWN_EDITOR_TAB.EDIT
  );

  const handleTabChange = (
    _event: SyntheticEvent,
    nextTab: MarkdownEditorTab
  ) => {
    setActiveTab(nextTab);
  };

  return (
    <Box data-color-mode="light" sx={editorContainerSx}>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        aria-label="Editor de markdown"
        sx={tabsSx}
      >
        <Tab
          value={MARKDOWN_EDITOR_TAB.EDIT}
          label={MARKDOWN_EDITOR_TAB_LABEL[MARKDOWN_EDITOR_TAB.EDIT]}
          icon={<EditOutlinedIcon fontSize="small" />}
          iconPosition="start"
        />
        <Tab
          value={MARKDOWN_EDITOR_TAB.PREVIEW}
          label={MARKDOWN_EDITOR_TAB_LABEL[MARKDOWN_EDITOR_TAB.PREVIEW]}
          icon={<VisibilityOutlinedIcon fontSize="small" />}
          iconPosition="start"
        />
      </Tabs>

      <Box
        sx={{
          display: activeTab === MARKDOWN_EDITOR_TAB.EDIT ? "block" : "none",
        }}
      >
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
          }}
        />
      </Box>

      <Box
        sx={{
          display: activeTab === MARKDOWN_EDITOR_TAB.PREVIEW ? "block" : "none",
          width: "100%",
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
        <ExplanationContent content={value} />
      </Box>
    </Box>
  );
};

export default MarkdownEditor;
