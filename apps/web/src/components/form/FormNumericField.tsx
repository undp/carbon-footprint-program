import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import { TextFieldProps } from "@mui/material";
import { NumericInput } from "../NumericInput";
import { toNullableNumber } from "@/utils/number";
import { translateValidationMessage } from "@/utils/translateValidationMessage";

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
  onlyInteger?: boolean;
  onlyIntegerMessage?: string;
  decimalScale?: number;
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
  onlyInteger = false,
  onlyIntegerMessage = "Debe ser un número entero",
  decimalScale,
  sx,
  ...props
}: Props<T>) => {
  const effectiveDecimalScale = onlyInteger ? 0 : decimalScale;
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        validate: {
          required: (value) => {
            if (!required) return true;
            return toNullableNumber(value) == null ? requiredMessage : true;
          },
          min: (value) => {
            const parsed = toNullableNumber(value);
            if (min === undefined || parsed == null) return true;
            return parsed < min ? minMessage : true;
          },
          max: (value) => {
            const parsed = toNullableNumber(value);
            if (max === undefined || parsed == null) return true;
            return parsed > max ? maxMessage : true;
          },
          onlyInteger: (value) => {
            const parsed = toNullableNumber(value);
            if (!onlyInteger || parsed == null) return true;
            return Number.isInteger(parsed) ? true : onlyIntegerMessage;
          },
        },
      }}
      render={({ field, fieldState }) => (
        <NumericInput
          size="medium"
          placeholder=""
          {...props}
          decimalScale={effectiveDecimalScale}
          value={toNullableNumber(field.value)}
          onChange={(value) => field.onChange(value)}
          onBlur={field.onBlur}
          name={field.name}
          inputRef={field.ref}
          min={min}
          required={required}
          error={!!fieldState.error && !props.disabled}
          helperText={
            translateValidationMessage(fieldState.error?.message) ?? helperText
          }
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
