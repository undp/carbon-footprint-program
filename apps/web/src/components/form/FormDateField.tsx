import { DatePicker } from "@mui/x-date-pickers";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import { format, isValid, parseISO } from "date-fns";
import { translateValidationMessage } from "@/utils/translateValidationMessage";

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  required?: boolean;
  requiredMessage?: string;
  helperText?: string;
  disabled?: boolean;
  maxDate?: Date;
};

export const FormDateField = <T extends FieldValues>({
  name,
  control,
  label,
  required,
  requiredMessage = "Este campo es obligatorio",
  helperText,
  disabled,
  maxDate,
}: Props<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: required ? requiredMessage : false,
      }}
      render={({ field, fieldState }) => {
        const dateValue =
          field.value && typeof field.value === "string"
            ? parseISO(field.value)
            : null;
        const validDateValue =
          dateValue && isValid(dateValue) ? dateValue : null;

        return (
          <DatePicker
            label={label}
            value={validDateValue}
            onChange={(date) => {
              if (date && isValid(date)) {
                field.onChange(format(date, "yyyy-MM-dd"));
              } else {
                field.onChange("");
              }
            }}
            disabled={disabled}
            maxDate={maxDate}
            slotProps={{
              textField: {
                fullWidth: true,
                required,
                error: !!fieldState.error && !disabled,
                helperText:
                  translateValidationMessage(fieldState.error?.message) ??
                  helperText,
                sx: { minHeight: "5rem" },
              },
            }}
          />
        );
      }}
    />
  );
};
