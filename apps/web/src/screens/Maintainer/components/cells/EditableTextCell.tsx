import { FC, useState, useEffect } from "react";
import { useWatch, useFormState, useFormContext } from "react-hook-form";
import { TextField, Typography, Tooltip, SxProps, Theme } from "@mui/material";
import type {
  FormMethodology,
  MethodologiesFormValues,
} from "../../hooks/useMethodologiesForm";

interface EditableTextCellProps {
  rowIndex: number;
  fieldName: keyof FormMethodology;
  isEditing: boolean;
  onChange: (value: string) => void;
  multiline?: boolean;
  maxRows?: number;
  /** Number of lines to show before truncating (1 = single line with ellipsis) */
  truncateLines?: number;
}

export const EditableTextCell: FC<EditableTextCellProps> = ({
  rowIndex,
  fieldName,
  isEditing,
  onChange,
  multiline = false,
  maxRows = 1,
  truncateLines = 1,
}) => {
  const { control } = useFormContext<MethodologiesFormValues>();
  const formValue = useWatch<MethodologiesFormValues>({
    name: `methodologies.${rowIndex}.${fieldName}`,
  }) as string;
  const { errors } = useFormState({
    control,
    name: `methodologies.${rowIndex}.${fieldName}`,
  });
  const fieldError = errors.methodologies?.[rowIndex]?.[fieldName];

  const [localValue, setLocalValue] = useState(formValue);

  // Sync local state when form value changes externally
  useEffect(() => {
    setLocalValue(formValue);
  }, [formValue]);

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
        <Typography sx={{ px: 1, ...truncateSx }}>{formValue}</Typography>
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
