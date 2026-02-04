import { FC } from "react";
import { Switch, useTheme } from "@mui/material";

interface Props {
  value: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const ToggleCell: FC<Props> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const theme = useTheme();
  return (
    <Switch
      checked={value}
      onChange={(_e, checked) => onChange(checked)}
      disabled={disabled}
      sx={{
        width: 42,
        height: 26,
        padding: 0,
        "& .MuiSwitch-switchBase": {
          padding: 0,
          paddingLeft: "4px",
          paddingTop: "4px",
          transitionDuration: "300ms",
          "&.Mui-checked": {
            transform: "translateX(15px)",
            color: theme.palette.common.white,
            "& + .MuiSwitch-track": {
              opacity: 1,
              border: 0,
            },
            "&.Mui-disabled + .MuiSwitch-track": {
              opacity: 0.5,
            },
          },
          "&.Mui-focusVisible .MuiSwitch-thumb": {
            border: `6px solid ${theme.palette.common.white}`,
          },
          "&.Mui-disabled .MuiSwitch-thumb": {
            color: theme.palette.grey[100],
          },
          "&.Mui-disabled + .MuiSwitch-track": {
            opacity: 0.7,
          },
        },
        "& .MuiSwitch-thumb": {
          boxSizing: "border-box",
          width: 18,
          height: 18,
        },
        "& .MuiSwitch-track": {
          borderRadius: 26 / 2,
          backgroundColor: "#E9E9EA",
          opacity: 1,
          transition: theme.transitions.create(["background-color"], {
            duration: 500,
          }),
        },
      }}
    />
  );
};
