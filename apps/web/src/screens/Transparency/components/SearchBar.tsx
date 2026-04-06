import { FC } from "react";
import { TextField, InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchBar: FC<SearchBarProps> = ({ value, onChange }) => {
  return (
    <TextField
      size="small"
      placeholder="Buscar por empresa o rubro..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ minWidth: 300, "& .MuiFormControl-root": { minHeight: "auto" } }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        },
      }}
    />
  );
};
