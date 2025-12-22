import { TextField, TextFieldProps } from "@mui/material";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  required?: boolean;
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
  fullWidth = true,
  ...props
}: Props<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: required ? "Este campo es obligatorio" : false,
      }}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          {...props}
          required={required}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? helperText}
          fullWidth={fullWidth}
          slotProps={{
            formHelperText: {
              sx: {
                position: "absolute",
                bottom: -20,
                left: 0,
                margin: 0,
              },
            },
          }}
        />
      )}
    />
  );
};
