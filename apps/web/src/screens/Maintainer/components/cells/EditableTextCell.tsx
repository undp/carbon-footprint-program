import { FC, useEffect, useRef, useState } from "react";
import {
  useWatch,
  useFormState,
  useFormContext,
  type FieldError,
} from "react-hook-form";
import {
  TextField,
  Typography,
  Tooltip,
  type SxProps,
  type Theme,
} from "@mui/material";
import { getNestedError } from "./cellUtils";
import { useOverflowTooltip } from "@/hooks";

interface EditableTextCellProps {
  /** Name of the form array (e.g. "methodologies", "categories") */
  formArrayName?: string;
  rowIndex: number;
  fieldName: string;
  isEditing: boolean;
  onChange: (value: string) => void;
  onClick?: () => void;
  multiline?: boolean;
  maxRows?: number;
  /** Number of lines to show before truncating (1 = single line with ellipsis) */
  truncateLines?: number;
  /** Horizontal padding (theme units) for the read-only display. Defaults to 1. */
  displayPaddingX?: number;
  /** Vertical padding (theme units) for the read-only display. Defaults to 0.5. */
  displayPaddingY?: number;
  /** Auto-focus the input when entering edit mode (useful for new rows). */
  autoFocus?: boolean;
  /** Text shown in read mode when the cell value is empty / null. */
  placeholder?: string;
  /** HTML maxLength applied to the underlying input — caps user input on the client. */
  maxLength?: number;
}

interface EditingTextFieldProps {
  initialValue: string;
  onChange: (value: string) => void;
  fieldError?: FieldError;
  multiline: boolean;
  maxRows: number;
  autoFocus: boolean;
  maxLength?: number;
}

/** Mounts fresh each time the cell enters edit mode, so useState always picks up the latest formValue. */
const EditingTextField: FC<EditingTextFieldProps> = ({
  initialValue,
  onChange,
  fieldError,
  multiline,
  maxRows,
  autoFocus,
  maxLength,
}) => {
  const [localValue, setLocalValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // On mount, optionally focus and always place the caret at the end so the
  // textarea scrolls to reveal the end of the content. Prevents the
  // "middle of text / arbitrary cursor position" issue when entering edit
  // mode with long multiline text.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    if (autoFocus) {
      el.focus();
    }
    const length = el.value.length;
    try {
      el.setSelectionRange(length, length);
    } catch {
      // Some input types don't support setSelectionRange; ignore.
    }
    if (el instanceof HTMLTextAreaElement) {
      el.scrollTop = el.scrollHeight;
    }
  }, [autoFocus]);

  return (
    <TextField
      fullWidth
      size="small"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => onChange(localValue)}
      onKeyDown={(e) => e.stopPropagation()}
      error={!!fieldError}
      label={fieldError?.message ?? ""}
      multiline={multiline}
      maxRows={maxRows}
      inputRef={inputRef}
      slotProps={
        maxLength !== undefined ? { htmlInput: { maxLength } } : undefined
      }
      sx={{
        "& .MuiOutlinedInput-root": {
          backgroundColor: "white",
        },
        minHeight: 0,
      }}
    />
  );
};

export const EditableTextCell: FC<EditableTextCellProps> = ({
  formArrayName = "methodologies",
  rowIndex,
  fieldName,
  isEditing,
  onChange,
  onClick,
  multiline = false,
  maxRows = 1,
  truncateLines = 1,
  displayPaddingX = 1,
  displayPaddingY = 0.5,
  autoFocus = false,
  placeholder,
  maxLength,
}) => {
  const formPath = `${formArrayName}.${rowIndex}.${fieldName}`;
  const { control } = useFormContext();
  const rawValue = useWatch({ name: formPath }) as string | null | undefined;
  const formValue = rawValue ?? "";
  const isEmpty = formValue === "";
  const displayValue = isEmpty && placeholder ? placeholder : formValue;
  const { errors } = useFormState({ control, name: formPath });
  const fieldError = getNestedError(
    errors as unknown as Record<string, unknown>,
    formArrayName,
    rowIndex,
    fieldName
  );

  const { isOverflowed, overflowRef } = useOverflowTooltip<HTMLElement>([
    displayValue,
    truncateLines,
  ]);

  if (!isEditing) {
    // For single-line we override display to `block`: text-overflow: ellipsis
    // does not apply on a flex container, so the base sx's `display: flex`
    // would otherwise clip the text without rendering an ellipsis. The
    // surrounding DataGrid cell handles vertical centering.
    const truncateSx: SxProps<Theme> =
      truncateLines === 1
        ? {
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            width: "100%",
          }
        : {
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: truncateLines,
            WebkitBoxOrient: "vertical",
            whiteSpace: "normal",
            wordBreak: "break-word",
            width: "100%",
          };

    return (
      <Tooltip
        title={isOverflowed ? displayValue : ""}
        arrow
        placement="top"
        enterDelay={500}
      >
        <Typography
          ref={overflowRef}
          onClick={onClick}
          sx={{
            px: displayPaddingX,
            py: displayPaddingY,
            minHeight: "2rem",
            display: "flex",
            alignItems: "center",
            borderRadius: 1,
            cursor: onClick ? "pointer" : "default",
            transition: "background-color 0.15s ease",
            color: isEmpty && placeholder ? "text.disabled" : undefined,
            "&:hover": onClick
              ? {
                  backgroundColor: "grey.100",
                }
              : {},
            ...truncateSx,
          }}
        >
          {displayValue}
        </Typography>
      </Tooltip>
    );
  }

  return (
    <EditingTextField
      initialValue={rawValue ?? ""}
      onChange={onChange}
      fieldError={fieldError}
      multiline={multiline}
      maxRows={maxRows}
      autoFocus={autoFocus}
      maxLength={maxLength}
    />
  );
};
