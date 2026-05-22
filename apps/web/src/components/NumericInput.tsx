import { FC } from "react";
import { InputAdornment, TextField, TextFieldProps } from "@mui/material";
import type { FieldError } from "react-hook-form";
import { NumericFormat, NumberFormatValues } from "react-number-format";
import { formatter } from "@/utils/formatting";

interface Props extends Omit<
  TextFieldProps,
  "onChange" | "value" | "defaultValue" | "type"
> {
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
  decimalScale = formatter.decimalScale,
  sx,
  fieldError,
  error,
  helperText,
  size = "small",
  fullWidth = true,
  placeholder = "0",
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
      // Pass "" instead of null/undefined: react-number-format treats nil
      // values as "switched to uncontrolled" and falls back to its internal
      // state, which prevents external resets from clearing the display.
      value={value ?? ""}
      valueIsNumericString={false}
      decimalSeparator={formatter.decimalSeparator}
      thousandSeparator={formatter.thousandSeparator}
      decimalScale={decimalScale}
      allowNegative={min === undefined || min < 0}
      onValueChange={handleValueChange}
      size={size}
      fullWidth={fullWidth}
      placeholder={placeholder}
      error={error || !!fieldError}
      helperText={helperText ?? fieldError?.message}
      slotProps={{
        input: {
          endAdornment: suffix && (
            <InputAdornment position="end">{suffix}</InputAdornment>
          ),
        },
        htmlInput: {
          inputMode: "decimal",
          autoComplete: "off",
          autoCorrect: "off",
          spellCheck: false,
        },
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
