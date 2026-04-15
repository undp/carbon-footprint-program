import { ChangeEventHandler, FC } from "react";
import { InputAdornment, TextField, TextFieldProps } from "@mui/material";
import type { FieldError } from "react-hook-form";

interface Props extends Omit<TextFieldProps, "onChange" | "value"> {
  onChange: ChangeEventHandler<HTMLInputElement>;
  value?: number | null;
  suffix?: string;
  min?: number;
  fieldError?: FieldError;
}

export const NumericInput: FC<Props> = ({
  onChange,
  value,
  suffix,
  min,
  sx,
  fieldError,
  error,
  helperText,
  ...props
}) => {
  const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const inputValue = e.target.value;

    // Allow empty string to pass through
    if (inputValue === "") {
      onChange(e);
      return;
    }

    const numValue = parseFloat(inputValue);

    // Clamp to min if defined and value is below min
    if (min !== undefined && numValue < min) {
      const valueToEmit = String(min);
      const clampedEvent = {
        ...e,
        target: {
          ...e.target,
          value: valueToEmit,
          name: e.target.name,
          dataset: e.target.dataset,
        },
      };
      onChange(clampedEvent as React.ChangeEvent<HTMLInputElement>);
      return;
    }

    onChange(e);
  };

  return (
    <TextField
      type="number"
      size="small"
      fullWidth
      value={value ?? ""}
      placeholder="0"
      error={error || !!fieldError}
      helperText={helperText ?? fieldError?.message}
      slotProps={{
        input: {
          endAdornment: suffix && (
            <InputAdornment position="end">{suffix}</InputAdornment>
          ),
        },
        htmlInput: min !== undefined ? { min } : undefined,
      }}
      onKeyDown={(e) => {
        // Stop propagation of arrow keys to prevent DataGrid navigation
        if (
          ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
        ) {
          e.stopPropagation();
        }
      }}
      onChange={handleChange}
      sx={{
        //* Align numbers to the right for better readability and consistency with numeric formatting conventions
        "& input": {
          textAlign: "right",
        },
        //* Remove default spin buttons for a cleaner UI and to prevent accidental clicks when entering values
        /* Chrome / Edge / Safari */
        "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
          {
            WebkitAppearance: "none",
            margin: 0,
          },
        /* Firefox - uses a different property to hide spin buttons */
        "& input[type=number]": {
          MozAppearance: "textfield",
        },
        ...sx,
      }}
      {...props}
    />
  );
};
