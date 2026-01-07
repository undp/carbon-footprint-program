import { ChangeEventHandler, FC } from "react";
import { InputAdornment, TextField, TextFieldProps } from "@mui/material";

interface Props extends Omit<TextFieldProps, "onChange" | "value"> {
  onChange: ChangeEventHandler<HTMLInputElement>;
  value?: number | null;
  suffix?: string;
}

export const NumericInput: FC<Props> = ({
  onChange,
  value,
  suffix,
  sx,
  ...props
}) => (
  <TextField
    type="number"
    size="small"
    fullWidth
    value={value ?? ""}
    placeholder="0"
    slotProps={{
      input: {
        endAdornment: suffix && (
          <InputAdornment position="end">{suffix}</InputAdornment>
        ),
      },
    }}
    onKeyDown={(e) => {
      // Stop propagation of arrow keys to prevent DataGrid navigation
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.stopPropagation();
      }
    }}
    onChange={onChange}
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
