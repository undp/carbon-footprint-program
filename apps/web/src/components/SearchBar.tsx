import { FC } from "react";
import {
  InputAdornment,
  SxProps,
  TextField,
  Theme,
  type TextFieldProps,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

interface SearchBarProps
  extends Omit<TextFieldProps, "value" | "onChange" | "size" | "sx"> {
  value: string;
  onChange: (value: string) => void;
  /** Custom styles merged with the base styles. */
  sx?: SxProps<Theme>;
}

export const SearchBar: FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = "Buscar...",
  sx,
  slotProps,
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
          ...slotProps?.input,
        },
      }}
    />
  );
};
