import { FC } from "react";
import { InputAdornment, TextField, TextFieldProps } from "@mui/material";
import type { FieldError } from "react-hook-form";
import { NumericFormat, NumberFormatValues } from "react-number-format";
import { NUMBER_LOCALE } from "@/config/locale";

interface Props
  extends Omit<TextFieldProps, "onChange" | "value" | "defaultValue" | "type"> {
  value: number | null;
  onChange: (value: number | null) => void;
  suffix?: string;
  min?: number;
  decimalScale?: number;
  fieldError?: FieldError;
}

export const NumericInput: FC<Props> = ({
  onChange,
  value,
  suffix,
  min,
  decimalScale = NUMBER_LOCALE.decimalScale,
  sx,
  fieldError,
  error,
  helperText,
  ...props
}) => {
  const handleValueChange = (values: NumberFormatValues): void => {
    const next = values.floatValue;
    if (next == null) {
      onChange(null);
      return;
    }
    if (min !== undefined && next < min) {
      onChange(min);
      return;
    }
    onChange(next);
  };

  return (
    <NumericFormat
      customInput={TextField}
      value={value}
      valueIsNumericString={false}
      decimalSeparator={NUMBER_LOCALE.decimalSeparator}
      thousandSeparator={NUMBER_LOCALE.thousandSeparator}
      decimalScale={decimalScale}
      allowNegative={min === undefined || min < 0}
      onValueChange={handleValueChange}
      size="small"
      fullWidth
      placeholder="0"
      error={error || !!fieldError}
      helperText={helperText ?? fieldError?.message}
      slotProps={{
        input: {
          endAdornment: suffix && (
            <InputAdornment position="end">{suffix}</InputAdornment>
          ),
        },
        htmlInput: { inputMode: "decimal" },
      }}
      onKeyDown={(e) => {
        if (
          ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
        ) {
          e.stopPropagation();
        }
      }}
      sx={{
        "& input": {
          textAlign: "right",
        },
        ...sx,
      }}
      {...props}
    />
  );
};
