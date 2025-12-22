import { useMemo } from "react";
import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  SelectProps,
} from "@mui/material";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";

type Option = { label: string; value: string | number };

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  labelId?: string;
  options: Option[];
  required?: boolean;
  helperText?: string;
  fullWidth?: boolean;
} & Omit<SelectProps, "name" | "label" | "labelId" | "value" | "onChange">;

export const FormSelectField = <T extends FieldValues>({
  name,
  control,
  label,
  labelId,
  options,
  required,
  helperText,
  fullWidth = true,
  ...props
}: Props<T>) => {
  const computedLabelId = useMemo(
    () => labelId ?? `${name}-label`,
    [labelId, name]
  );

  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: required ? "Este campo es obligatorio" : false,
      }}
      render={({ field, fieldState }) => (
        <FormControl
          fullWidth={fullWidth}
          required={required} // solo visual
          error={!!fieldState.error}
          sx={{ position: "relative" }}
        >
          <InputLabel id={computedLabelId}>{label}</InputLabel>

          <Select {...field} labelId={computedLabelId} label={label} {...props}>
            {options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>

          {(fieldState.error?.message || helperText) && (
            <FormHelperText
              sx={{
                position: "absolute",
                bottom: -20,
                left: 0,
                margin: 0,
              }}
            >
              {fieldState.error?.message ?? helperText}
            </FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
};
