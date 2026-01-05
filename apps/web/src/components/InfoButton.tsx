import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import {
  IconButton,
  IconButtonProps,
  Tooltip,
  TooltipProps,
} from "@mui/material";

interface InfoButtonProps extends IconButtonProps {
  label: string;
  placement?: TooltipProps["placement"];
}

export const InfoButton = ({
  label,
  disabled = false,
  size = "small",
  color = "default",
  placement = "top",
  ...buttonProps
}: InfoButtonProps) => {
  return (
    <Tooltip title={disabled ? "" : label} placement={placement}>
      <IconButton
        aria-label={label}
        size={size}
        color={color}
        disabled={disabled}
        {...buttonProps}
      >
        <InfoOutlineIcon />
      </IconButton>
    </Tooltip>
  );
};
