import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import { NumericInput } from "../NumericInput";

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  required?: boolean;
  requiredMessage?: string;
  disabled?: boolean;
  min?: number;
  suffix?: string;
  helperText?: string;
  fullWidth?: boolean;
};

export const FormNumericInput = <T extends FieldValues>({
  name,
  control,
  label,
  required,
  requiredMessage = "Este campo es obligatorio",
  disabled,
  min,
  suffix,
  helperText,
  fullWidth = true,
}: Props<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: required ? requiredMessage : false,
      }}
      render={({ field, fieldState }) => (
        <NumericInput
          {...field}
          label={label}
          error={!!fieldState.error && !disabled}
          helperText={fieldState.error?.message ?? helperText}
          required={required}
          disabled={disabled}
          min={min}
          suffix={suffix}
          value={field.value ? parseFloat(field.value) : null}
          onChange={(e) => field.onChange(e.target.value)}
          fullWidth={fullWidth}
          sx={{
            minHeight: "5rem",
          }}
        />
      )}
    />
  );
};
