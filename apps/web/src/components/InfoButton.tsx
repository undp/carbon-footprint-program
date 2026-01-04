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
  const button = (
    <IconButton
      aria-label={label}
      size={size}
      color={color}
      disabled={disabled}
      {...buttonProps}
    >
      <InfoOutlineIcon />
    </IconButton>
  );

  if (disabled) {
    return button;
  }

  return (
    <Tooltip title={label} placement={placement}>
      {button}
    </Tooltip>
  );
};
