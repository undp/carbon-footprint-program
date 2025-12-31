import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import {
  IconButton,
  IconButtonProps,
  Tooltip,
  TooltipProps,
} from "@mui/material";

type InfoButtonProps = {
  label: string;
  size?: IconButtonProps["size"];
  color?: IconButtonProps["color"];
  placement?: TooltipProps["placement"];
  onClick?: IconButtonProps["onClick"];
  sx?: IconButtonProps["sx"];
};

export const InfoButton = ({
  label,
  size = "small",
  color = "default",
  placement = "top",
  onClick,
  sx,
}: InfoButtonProps) => (
  <Tooltip title={label} placement={placement}>
    <IconButton
      aria-label={label}
      size={size}
      color={color}
      onClick={onClick}
      sx={sx}
    >
      <InfoOutlineIcon />
    </IconButton>
  </Tooltip>
);
