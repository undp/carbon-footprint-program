import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch } from "react";
import { Box } from "@mui/material";
import { alpha, type SxProps, type Theme } from "@mui/material/styles";
import MDEditor, { commands } from "@uiw/react-md-editor";
import type {
  ContextStore,
  ExecuteCommandState,
  ExecuteState,
  ICommand,
  TextAreaTextApi,
} from "@uiw/react-md-editor";
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
  height?: number;
  minHeight?: number;
}

interface FullscreenExecuteContext {
  state: ExecuteState;
  api: TextAreaTextApi;
  dispatch: Dispatch<ContextStore> | undefined;
  executeCommandState: ExecuteCommandState | undefined;
  shortcuts: string[] | undefined;
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

const renderExplanationPreview = (source: string | undefined) => (
  <ExplanationContent content={source ?? ""} />
);

const MarkdownEditor = ({
  value,
  onChange,
  placeholder = DEFAULT_MARKDOWN_EDITOR_PLACEHOLDER,
  height = DEFAULT_MARKDOWN_EDITOR_HEIGHT,
  minHeight,
}: MarkdownEditorProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const executeContextRef = useRef<FullscreenExecuteContext | null>(null);

  const fullscreenCommand = useMemo<ICommand>(
    () => ({
      ...commands.fullscreen,
      execute: (state, api, dispatch, executeCommandState, shortcuts) => {
        executeContextRef.current = {
          state,
          api,
          dispatch,
          executeCommandState,
          shortcuts,
        };
        commands.fullscreen.execute?.(
          state,
          api,
          dispatch,
          executeCommandState,
          shortcuts
        );
        setIsFullscreen((prev) => !prev);
      },
    }),
    []
  );

  const toolbarCommands = useMemo<ICommand[]>(
    () =>
      MARKDOWN_EDITOR_TOOLBAR_COMMANDS.map((command) =>
        command.name === "fullscreen" ? fullscreenCommand : command
      ),
    [fullscreenCommand]
  );

  useEffect(() => {
    if (!isFullscreen) {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const context = executeContextRef.current;
      if (context) {
        commands.fullscreen.execute?.(
          context.state,
          context.api,
          context.dispatch,
          context.executeCommandState,
          context.shortcuts
        );
      }
      setIsFullscreen(false);
    };
    document.addEventListener("keydown", handler, true);
    return () => {
      document.removeEventListener("keydown", handler, true);
    };
  }, [isFullscreen]);

  const handleChange = useCallback(
    (next: string | undefined) => {
      onChange(next ?? "");
    },
    [onChange]
  );

  return (
    <Box data-color-mode="light" sx={editorContainerSx}>
      <MDEditor
        value={value}
        onChange={handleChange}
        preview="live"
        hideToolbar={false}
        visibleDragbar={false}
        height={height}
        minHeight={minHeight}
        commands={toolbarCommands}
        extraCommands={[]}
        textareaProps={{ placeholder }}
        components={{ preview: renderExplanationPreview }}
      />
    </Box>
  );
};

export default MarkdownEditor;
