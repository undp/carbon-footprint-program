import { TextField, TextFieldProps } from "@mui/material";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import { translateValidationMessage } from "@/utils/translateValidationMessage";

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  required?: boolean;
  requiredMessage?: string;
  min?: number;
  minMessage?: string;
  helperText?: string;
  fullWidth?: boolean;
} & Omit<
  TextFieldProps,
  "name" | "value" | "onChange" | "required" | "helperText" | "fullWidth"
>;

export const FormTextField = <T extends FieldValues>({
  name,
  control,
  helperText,
  required,
  requiredMessage = "Este campo es obligatorio",
  min,
  minMessage = "El valor es demasiado bajo",
  fullWidth = true,
  ...props
}: Props<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: required ? requiredMessage : false,
        validate:
          min !== undefined
            ? {
                min: (value) => {
                  if (value === "" || value == null) {
                    return true;
                  }
                  const valueNum = Number(value);
                  if (isNaN(valueNum) || valueNum < min) {
                    return minMessage;
                  }
                  return true;
                },
              }
            : undefined,
      }}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          {...props}
          sx={{
            minHeight: "5rem",
          }}
          required={required}
          error={!!fieldState.error && !props.disabled}
          helperText={
            translateValidationMessage(fieldState.error?.message) ?? helperText
          }
          fullWidth={fullWidth}
        />
      )}
    />
  );
};
