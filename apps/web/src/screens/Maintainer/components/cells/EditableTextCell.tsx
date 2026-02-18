import { FC, useState } from "react";
import {
  useWatch,
  useFormState,
  useFormContext,
  type FieldError,
} from "react-hook-form";
import { TextField, Typography, Tooltip, type SxProps, type Theme } from "@mui/material";

/** Traverse a nested object by path segments, returning the value at that path. */
function getNestedError(
  obj: Record<string, unknown>,
  ...keys: (string | number)[]
): FieldError | undefined {
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string | number, unknown>)[key];
  }
  return current as FieldError | undefined;
}

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

  const [localValue, setLocalValue] = useState(formValue);

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
            width: "100%",
          };

    return (
      <Tooltip title={formValue} arrow placement="top" enterDelay={500}>
        <Typography
          onClick={onClick}
          sx={{
            px: 1,
            py: 0.5,
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
