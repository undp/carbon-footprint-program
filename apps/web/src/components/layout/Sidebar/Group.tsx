import { FC, useCallback, useState } from "react";
import {
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  alpha,
  useTheme,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { Link, useLocation } from "@tanstack/react-router";
import type { SystemRole } from "@repo/types";
import { Item } from "./Item";

export interface SidebarGroupItem {
  icon: React.ReactNode;
  text: string;
  path?: string;
  disabled?: boolean;
  requiredRoles?: SystemRole[];
}

export interface SidebarGroupProps extends SidebarGroupItem {
  children: SidebarGroupItem[];
}

export const Group: FC<SidebarGroupProps> = ({
  icon,
  text,
  path,
  disabled,
  children,
}) => {
  const theme = useTheme();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = location.pathname === path;
  const isChildActive = children.some(
    (child) => location.pathname === child.path
  );
  const isGroupOpen = isActive || isChildActive || isOpen;

  const backgroundColor = alpha(theme.palette.secondary.main, 0.2);
  const selectedTextColor = theme.palette.primary.main;

  const handleToggleGroup = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      if (isActive || isChildActive) return;
      setIsOpen((prev) => !prev);
    },
    [isChildActive, isActive]
  );

  return (
    <>
      <ListItem sx={{ mb: isGroupOpen ? 0.5 : 2 }} disablePadding>
        <ListItemButton
          component={Link}
          to={path}
          disabled={disabled}
          onClick={handleToggleGroup}
          selected={isActive}
          sx={{
            mx: 1,
            minHeight: 34,
            borderRadius: 34,
            pt: 0.5,
            pb: 0.5,
            mr: 0,
            ml: 0,
            "& .MuiListItemIcon-root": {
              mr: 1,
              minWidth: "unset",
            },
            "& .MuiListItemText-primary": {
              mt: 0,
              mb: 0,
            },
            "&.Mui-selected": {
              borderRadius: 34,
              backgroundColor,
              color: selectedTextColor,
              fontWeight: "bold",
              "& .MuiListItemIcon-root": {
                color: selectedTextColor,
              },
              "& .MuiListItemText-primary": {
                color: selectedTextColor,
                fontWeight: "bold",
              },
              "&:hover": {
                color: selectedTextColor,
                backgroundColor,
              },
            },
          }}
        >
          <ListItemIcon>{icon}</ListItemIcon>
          <ListItemText primary={text} />
          <IconButton disableRipple size="small" sx={{ p: 0 }}>
            {isGroupOpen ? (
              <ExpandLess sx={{ fontSize: 16 }} />
            ) : (
              <ExpandMore sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        </ListItemButton>
      </ListItem>
      <Collapse in={isGroupOpen} timeout="auto" unmountOnExit>
        <List component="div" disablePadding sx={{ mb: 1 }}>
          {children.map((child) => (
            <Item
              key={child.path}
              icon={child.icon}
              text={child.text}
              path={child.path}
              selected={location.pathname === child.path}
              disabled={child.disabled}
              isChild
            />
          ))}
        </List>
      </Collapse>
    </>
  );
};
