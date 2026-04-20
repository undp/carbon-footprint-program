import { FC, useState } from "react";
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
}

interface EditingTextFieldProps {
  initialValue: string;
  onChange: (value: string) => void;
  fieldError?: FieldError;
  multiline: boolean;
  maxRows: number;
}

/** Mounts fresh each time the cell enters edit mode, so useState always picks up the latest formValue. */
const EditingTextField: FC<EditingTextFieldProps> = ({
  initialValue,
  onChange,
  fieldError,
  multiline,
  maxRows,
}) => {
  const [localValue, setLocalValue] = useState(initialValue);

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
}) => {
  const formPath = `${formArrayName}.${rowIndex}.${fieldName}`;
  const { control } = useFormContext();
  const formValue = useWatch({ name: formPath }) as string;
  const { errors } = useFormState({ control, name: formPath });
  const fieldError = getNestedError(
    errors as unknown as Record<string, unknown>,
    formArrayName,
    rowIndex,
    fieldName
  );

  const { isOverflowed, overflowRef } = useOverflowTooltip<HTMLElement>([
    formValue,
    truncateLines,
  ]);

  if (!isEditing) {
    const truncateSx: SxProps<Theme> =
      truncateLines === 1
        ? {
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
        title={isOverflowed ? formValue : ""}
        arrow
        placement="top"
        enterDelay={500}
      >
        <Typography
          ref={overflowRef}
          onClick={onClick}
          sx={{
            px: 1,
            py: 0.5,
            minHeight: "2rem",
            display: "flex",
            alignItems: "center",
            borderRadius: 1,
            cursor: onClick ? "pointer" : "default",
            transition: "background-color 0.15s ease",
            "&:hover": onClick
              ? {
                  backgroundColor: "grey.100",
                }
              : {},
            ...truncateSx,
          }}
        >
          {formValue}
        </Typography>
      </Tooltip>
    );
  }

  return (
    <EditingTextField
      initialValue={formValue}
      onChange={onChange}
      fieldError={fieldError}
      multiline={multiline}
      maxRows={maxRows}
    />
  );
};
