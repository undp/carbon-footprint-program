import { ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { SxProps, useTheme } from "@mui/material/styles";

interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

interface StyledToggleButtonGroupProps<T extends string> {
  sx?: SxProps;
  value: T;
  onChange: (value: T) => void;
  options: ToggleOption<T>[];
}

export function StyledToggleButtonGroup<T extends string>({
  sx,
  value,
  onChange,
  options,
}: StyledToggleButtonGroupProps<T>) {
  const theme = useTheme();

  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_e, newValue: T | null) => {
        if (newValue !== null) onChange(newValue);
      }}
      color="primary"
      sx={{
        ...sx,
        "& .MuiToggleButton-root": {
          minWidth: 105,
          "&:not(.Mui-selected)": {
            color: theme.palette.primary.main,
          },
        },
        "& .Mui-selected": {
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.common.white,
          "&:hover": {
            backgroundColor: theme.palette.primary.dark,
          },
        },
      }}
    >
      {options.map((option) => (
        <ToggleButton key={option.value} value={option.value}>
          <Typography variant="caption" fontWeight="fontWeightMedium">
            {option.label}
          </Typography>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
