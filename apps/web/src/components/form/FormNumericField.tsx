import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import { TextFieldProps } from "@mui/material";
import { NumericInput } from "../NumericInput";

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  required?: boolean;
  requiredMessage?: string;
  min?: number;
  minMessage?: string;
  max?: number;
  maxMessage?: string;
  helperText?: string;
  fullWidth?: boolean;
} & Omit<
  TextFieldProps,
  | "name"
  | "value"
  | "onChange"
  | "required"
  | "helperText"
  | "fullWidth"
  | "type"
>;

export const FormNumericField = <T extends FieldValues>({
  name,
  control,
  helperText,
  required,
  requiredMessage = "Este campo es obligatorio",
  min,
  minMessage = "El valor es demasiado bajo",
  max,
  maxMessage = "El valor es demasiado alto",
  fullWidth = true,
  sx,
  ...props
}: Props<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        validate: {
          required: (value) => {
            if (!required) return true;
            return value == null ? requiredMessage : true;
          },
          min: (value) => {
            if (min === undefined || value == null) return true;
            return Number(value) < min ? minMessage : true;
          },
          max: (value) => {
            if (max === undefined || value == null) return true;
            return Number(value) > max ? maxMessage : true;
          },
        },
      }}
      render={({ field, fieldState }) => (
        <NumericInput
          size="medium"
          placeholder=""
          {...props}
          value={field.value == null ? null : Number(field.value)}
          onChange={(value) => field.onChange(value)}
          min={min}
          required={required}
          error={!!fieldState.error && !props.disabled}
          helperText={fieldState.error?.message ?? helperText}
          fullWidth={fullWidth}
          sx={{
            minHeight: "5rem",
            "& input": { textAlign: "left" },
            ...sx,
          }}
        />
      )}
    />
  );
};
