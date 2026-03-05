import { TextField, TextFieldProps } from "@mui/material";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";

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
  slotProps,
  ...props
}: Props<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: required ? requiredMessage : false,
        validate: {
          min: (value) => {
            if (min === undefined || value === "" || value == null) {
              return true;
            }
            const valueNum = Number(value);
            if (isNaN(valueNum) || valueNum < min) {
              return minMessage;
            }
            return true;
          },
          max: (value) => {
            if (max === undefined || value === "" || value == null) {
              return true;
            }
            const valueNum = Number(value);
            if (isNaN(valueNum) || valueNum > max) {
              return maxMessage;
            }
            return true;
          },
        },
      }}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          {...props}
          type="number"
          slotProps={{
            ...slotProps,
            htmlInput: {
              min,
              max,
              ...slotProps?.htmlInput,
            },
          }}
          sx={{
            minHeight: "5rem",
            "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
              {
                WebkitAppearance: "none",
                margin: 0,
              },
            "& input[type=number]": {
              MozAppearance: "textfield",
            },
            ...sx,
          }}
          required={required}
          error={!!fieldState.error && !props.disabled}
          helperText={fieldState.error?.message ?? helperText}
          fullWidth={fullWidth}
        />
      )}
    />
  );
};
