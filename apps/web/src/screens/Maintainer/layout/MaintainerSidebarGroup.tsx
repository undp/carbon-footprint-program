import { useState } from "react";
import {
  Collapse,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { MaintainerSidebarItem, SidebarItem } from "./MaintainerSidebarItem";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { useLocation, useNavigate } from "@tanstack/react-router";

export interface SidebarGroup extends SidebarItem {
  children: SidebarItem[];
}

export const MaintainerSidebarGroup = ({
  label,
  icon,
  disabled,
  path,
  children,
}: SidebarGroup) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const isActive = location.pathname === path;
  const isChildActive = children.some(
    (child) => location.pathname === child.path
  );

  const isGroupOpen = isActive || isChildActive || isOpen;

  const handleClick = () => {
    setIsOpen(true);
    void navigate({ to: path });
  };

  const handleToggleGroup = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isChildActive && !isActive) setIsOpen(!isOpen);
  };

  return (
    <>
      <ListItemButton
        disableRipple
        disabled={disabled}
        onClick={handleClick}
        selected={isActive}
        sx={{
          borderRadius: 6,
          mb: 0.5,
          minHeight: 40,
        }}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
        <ListItemText
          primary={label}
          slotProps={{
            primary: {
              fontSize: 14,
              ...(isGroupOpen ? { fontWeight: 500 } : {}),
            },
          }}
        />
        <IconButton onClick={handleToggleGroup} disableRipple>
          {isGroupOpen ? (
            <ExpandLess sx={{ fontSize: 16 }} />
          ) : (
            <ExpandMore sx={{ fontSize: 16 }} />
          )}
        </IconButton>
      </ListItemButton>
      <Collapse in={isGroupOpen} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {children.map((child) => (
            <MaintainerSidebarItem key={child.label} {...child} isChild />
          ))}
        </List>
      </Collapse>
    </>
  );
};
