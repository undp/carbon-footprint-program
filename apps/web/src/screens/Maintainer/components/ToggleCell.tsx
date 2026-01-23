import { FC } from "react";
import { Switch } from "@mui/material";

interface Props {
  value: boolean;
  onChange: (checked: boolean) => void;
}

export const ToggleCell: FC<Props> = ({ value, onChange }) => (
  <Switch
    checked={value}
    onChange={(_e, checked) => onChange(checked)}
    color="primary"
    size="small"
  />
);
