import { ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { useLocation, useNavigate } from "@tanstack/react-router";
import React from "react";

export interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  path?: string;
}

interface Props extends SidebarItem {
  isChild?: boolean;
}

export const MaintainerSidebarItem = ({
  label,
  icon,
  disabled,
  path,
  isChild = false,
}: Props) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = location.pathname === path;

  return (
    <ListItemButton
      disabled={disabled}
      onClick={() => navigate({ to: path })}
      disableRipple
      selected={isActive}
      sx={
        isChild
          ? { borderRadius: 6, mb: 0.5, height: 36, ml: 3 }
          : { borderRadius: 6, mb: 0.5, minHeight: 40 }
      }
    >
      <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
      <ListItemText
        primary={label}
        slotProps={{
          primary: isChild
            ? { fontSize: 13, fontWeight: isActive ? 600 : 400 }
            : { fontSize: 14 },
        }}
      />
    </ListItemButton>
  );
};
