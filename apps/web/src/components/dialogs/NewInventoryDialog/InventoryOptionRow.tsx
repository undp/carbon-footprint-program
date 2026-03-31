import {
  Box,
  Avatar,
  Chip,
  CircularProgress,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography,
  type SvgIconProps,
} from "@mui/material";
import { ChevronRight } from "@mui/icons-material";
import { FC } from "react";

export interface InventoryOptionRowProps {
  Icon: React.ComponentType<SvgIconProps>;
  title: string;
  actionLabel: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export const InventoryOptionRow: FC<InventoryOptionRowProps> = ({
  Icon,
  title,
  actionLabel,
  description,
  onClick,
  disabled,
  loading,
}) => (
  <ListItemButton
    onClick={onClick}
    disabled={disabled}
    sx={{ borderRadius: 2, py: 1.5 }}
  >
    <ListItemAvatar>
      <Avatar sx={{ bgcolor: "action.selected" }}>
        <Icon sx={{ color: "text.primary" }} />
      </Avatar>
    </ListItemAvatar>
    <ListItemText
      primary={
        <Box className="flex items-center gap-2">
          <Typography variant="subtitle2" fontWeight={600}>
            {title}
          </Typography>
          <Chip
            label={actionLabel}
            size="small"
            sx={{
              bgcolor: "success.main",
              color: "common.white",
              fontWeight: 600,
            }}
          />
        </Box>
      }
      secondary={description}
    />
    {loading ? (
      <CircularProgress size={20} sx={{ ml: 1 }} />
    ) : (
      <ChevronRight sx={{ color: "text.secondary", ml: 1 }} />
    )}
  </ListItemButton>
);
