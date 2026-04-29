import { FC } from "react";
import {
  IconButton,
  InputAdornment,
  SxProps,
  TextField,
  Theme,
  type TextFieldProps,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

interface SearchBarProps
  extends Omit<TextFieldProps, "value" | "onChange" | "size" | "sx"> {
  value: string;
  onChange: (value: string) => void;
  /** Custom styles merged with the base styles. */
  sx?: SxProps<Theme>;
  /** Show a clear button at the end when the input has a value. Defaults to true. */
  showClearButton?: boolean;
}

export const SearchBar: FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = "Buscar...",
  sx,
  slotProps,
  showClearButton = true,
  ...rest
}) => {
  const baseStyles: SxProps<Theme> = {
    minWidth: 300,
    width: "100%",
    "& .MuiFormControl-root": { minHeight: "auto" },
  };

  const sxArray = (Array.isArray(sx) ? sx : sx ? [sx] : []) as SxProps<Theme>[];
  const combinedStyles = [baseStyles, ...sxArray] as SxProps<Theme>;

  return (
    <TextField
      {...rest}
      size="small"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={combinedStyles}
      slotProps={{
        ...slotProps,
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment:
            showClearButton && value ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  edge="end"
                  aria-label="Borrar"
                  onClick={() => onChange("")}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          ...slotProps?.input,
        },
      }}
    />
  );
};
