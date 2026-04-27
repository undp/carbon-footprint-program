import { FC } from "react";
import { useWatch, useFormState, useFormContext } from "react-hook-form";
import { Select, MenuItem, Typography, Tooltip } from "@mui/material";
import { getNestedError } from "./cellUtils";
import { useOverflowTooltip } from "@/hooks";

interface Option {
  id: string;
  name: string;
}

interface EditableSelectCellProps {
  formArrayName: string;
  rowIndex: number;
  fieldName: string;
  isEditing: boolean;
  options: Option[];
  onChange: (value: string | null) => void;
  onClick?: () => void;
  /** Allow selecting an empty value (renders the empty option). */
  allowEmpty?: boolean;
  /** Label for the empty option when `allowEmpty` is true. */
  emptyLabel?: string;
  /** Placeholder shown in read mode when the value is empty. */
  placeholder?: string;
}

export const EditableSelectCell: FC<EditableSelectCellProps> = ({
  formArrayName,
  rowIndex,
  fieldName,
  isEditing,
  options,
  onChange,
  onClick,
  allowEmpty = false,
  emptyLabel,
  placeholder = "—",
}) => {
  const formPath = `${formArrayName}.${rowIndex}.${fieldName}`;
  const { control } = useFormContext();
  const value = useWatch({ name: formPath }) as string | null | undefined;
  const { errors } = useFormState({ control, name: formPath });
  const fieldError = getNestedError(
    errors as unknown as Record<string, unknown>,
    formArrayName,
    rowIndex,
    fieldName
  );

  const displayName =
    (value && options.find((o) => o.id === value)?.name) || placeholder;

  const { isOverflowed, overflowRef } = useOverflowTooltip<HTMLElement>([
    displayName,
  ]);

  if (!isEditing) {
    return (
      <Tooltip
        title={isOverflowed ? displayName : ""}
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
            borderRadius: 1,
            cursor: onClick ? "pointer" : "default",
            transition: "background-color 0.15s ease",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            width: "100%",
            "&:hover": onClick ? { backgroundColor: "grey.100" } : {},
          }}
        >
          {displayName}
        </Typography>
      </Tooltip>
    );
  }

  return (
    <Select
      fullWidth
      size="small"
      value={value ?? ""}
      onChange={(e) => {
        const next = e.target.value;
        onChange(next === "" ? null : next);
      }}
      error={!!fieldError}
      onKeyDown={(e) => e.stopPropagation()}
      displayEmpty={allowEmpty}
      sx={{
        "& .MuiOutlinedInput-notchedOutline": {
          backgroundColor: "transparent",
        },
        backgroundColor: "white",
      }}
    >
      {allowEmpty && (
        <MenuItem value="">
          <em>{emptyLabel ?? "—"}</em>
        </MenuItem>
      )}
      {options.map((o) => (
        <MenuItem key={o.id} value={o.id}>
          {o.name}
        </MenuItem>
      ))}
    </Select>
  );
};
