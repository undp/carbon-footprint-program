import { FC } from "react";
import { Autocomplete, TextField, Tooltip, Typography } from "@mui/material";
import { useFormContext, useFormState, useWatch } from "react-hook-form";
import { getNestedError } from "./cellUtils";

export interface AutocompleteCellOption {
  id: string;
  name: string;
}

interface AutocompleteCellProps {
  formArrayName: string;
  rowIndex: number;
  fieldName: string;
  isEditing: boolean;
  options: AutocompleteCellOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
  onClick?: () => void;
  placeholder?: string;
}

export const AutocompleteCell: FC<AutocompleteCellProps> = ({
  formArrayName,
  rowIndex,
  fieldName,
  isEditing,
  options,
  disabled,
  onChange,
  onClick,
  placeholder,
}) => {
  const formPath = `${formArrayName}.${rowIndex}.${fieldName}`;
  const { control } = useFormContext();
  const value = useWatch({ name: formPath }) as string;
  const { errors } = useFormState({ control, name: formPath });
  const fieldError = getNestedError(
    errors as unknown as Record<string, unknown>,
    formArrayName,
    rowIndex,
    fieldName
  );

  const selected = options.find((o) => o.id === value) ?? null;

  if (!isEditing) {
    const label = selected?.name ?? "—";
    const interactive = Boolean(onClick);
    return (
      <Typography
        onClick={onClick}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={
          interactive
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
        sx={{
          px: 1,
          py: 0.5,
          minHeight: "2rem",
          display: "flex",
          alignItems: "center",
          borderRadius: 1,
          cursor: interactive ? "pointer" : "default",
          width: "100%",
          whiteSpace: "normal",
          wordBreak: "break-word",
          color: selected ? undefined : "text.secondary",
          "&:hover": interactive ? { backgroundColor: "grey.100" } : {},
          "&:focus-visible": interactive
            ? { outline: "2px solid", outlineColor: "primary.main" }
            : {},
        }}
      >
        {label}
      </Typography>
    );
  }

  return (
    <Tooltip title={fieldError?.message ?? ""} arrow placement="top">
      <Autocomplete<AutocompleteCellOption, false, false, false>
        fullWidth
        size="small"
        disabled={disabled}
        options={options}
        value={selected}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, v) => option.id === v.id}
        onChange={(_, newValue) => onChange(newValue?.id ?? "")}
        sx={{
          "& .MuiAutocomplete-inputRoot": { py: 0 },
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder}
            error={!!fieldError}
            onKeyDown={(e) => e.stopPropagation()}
            sx={{
              "& .MuiOutlinedInput-root": { backgroundColor: "white" },
              minHeight: 0,
            }}
          />
        )}
      />
    </Tooltip>
  );
};
