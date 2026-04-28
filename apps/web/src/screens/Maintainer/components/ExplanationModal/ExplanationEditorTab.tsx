import { FC, KeyboardEvent, useCallback, useLayoutEffect, useRef } from "react";
import { Box, TextField } from "@mui/material";
import { ExplanationToolbar, ToolbarInsertSpec } from "./ExplanationToolbar";
import { insertMarkdown } from "./insertMarkdown";

interface ExplanationEditorTabProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const ExplanationEditorTab: FC<ExplanationEditorTabProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(
    null
  );

  useLayoutEffect(() => {
    const pending = pendingSelectionRef.current;
    if (!pending) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(pending.start, pending.end);
    pendingSelectionRef.current = null;
  });

  const applyInsert = useCallback(
    (spec: ToolbarInsertSpec) => {
      const textarea = textareaRef.current;
      const selectionStart = textarea?.selectionStart ?? value.length;
      const selectionEnd = textarea?.selectionEnd ?? value.length;
      const result = insertMarkdown({
        value,
        selectionStart,
        selectionEnd,
        ...spec,
      });
      pendingSelectionRef.current = {
        start: result.selectionStart,
        end: result.selectionEnd,
      };
      onChange(result.value);
    },
    [value, onChange]
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === "b") {
      event.preventDefault();
      applyInsert({ before: "**", after: "**", placeholder: "texto" });
    } else if (key === "i") {
      event.preventDefault();
      applyInsert({ before: "*", after: "*", placeholder: "texto" });
    }
  };

  return (
    <Box
      sx={(theme) => ({
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        overflow: "hidden",
      })}
    >
      <ExplanationToolbar onInsert={applyInsert} disabled={disabled} />
      <TextField
        inputRef={textareaRef}
        fullWidth
        multiline
        minRows={12}
        maxRows={24}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe la explicación aquí..."
        disabled={disabled}
        slotProps={{
          input: { sx: { fontFamily: "monospace", fontSize: "0.875rem" } },
        }}
        variant="standard"
        sx={{
          "& .MuiInputBase-root": {
            px: 1.5,
            py: 1,
            "&:before, &:after": { display: "none" },
          },
        }}
      />
    </Box>
  );
};
