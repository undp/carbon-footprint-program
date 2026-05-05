import { FC, useCallback, useState } from "react";
import {
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  alpha,
  useTheme,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { Link, useLocation } from "@tanstack/react-router";
import type { SystemRole } from "@repo/types";
import { Item } from "./Item";
import { sidebarTransition } from "@/theme";

export interface SidebarGroupItem {
  icon: React.ReactNode;
  text: string;
  path?: string;
  disabled?: boolean;
  requiredRoles?: SystemRole[];
}

export interface SidebarGroupProps extends SidebarGroupItem {
  children: SidebarGroupItem[];
  isExpanded?: boolean;
  onRequestExpand?: () => void;
}

export const Group: FC<SidebarGroupProps> = ({
  icon,
  text,
  path,
  disabled,
  children,
  isExpanded = true,
  onRequestExpand,
}) => {
  const theme = useTheme();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = location.pathname === path;
  const isChildActive = children.some(
    (child) => location.pathname === child.path
  );
  const isGroupOpen = isExpanded && (isActive || isChildActive || isOpen);

  const backgroundColor = alpha(theme.palette.secondary.main, 0.2);
  const selectedTextColor = theme.palette.primary.main;

  const handleToggleGroup = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      if (!isExpanded) {
        onRequestExpand?.();
        setIsOpen(true);
        return;
      }
      if (isActive || isChildActive) return;
      setIsOpen((prev) => !prev);
    },
    [isChildActive, isActive, isExpanded, onRequestExpand]
  );

  const button = (
    <ListItemButton
      component={Link}
      to={path}
      disabled={disabled}
      onClick={handleToggleGroup}
      selected={isActive || (!isExpanded && isChildActive)}
      sx={{
        minHeight: 34,
        borderRadius: 34,
        py: 0.5,
        px: 2,
        ml: 0,
        mr: 0,
        justifyContent: isExpanded ? "flex-start" : "center",
        "& .MuiListItemIcon-root": {
          mr: isExpanded ? 1 : 0,
          minWidth: 0,
          justifyContent: "center",
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
      <ListItemText
        primary={text}
        slotProps={{ primary: { noWrap: true } }}
        sx={{
          opacity: isExpanded ? 1 : 0,
          width: isExpanded ? "auto" : 0,
          flex: isExpanded ? "1 1 auto" : "0 0 0",
          overflow: "hidden",
          transition: sidebarTransition(theme, "opacity"),
        }}
      />
      <IconButton
        disableRipple
        size="small"
        sx={{
          p: 0,
          opacity: isExpanded ? 1 : 0,
          width: isExpanded ? "auto" : 0,
          minWidth: 0,
          overflow: "hidden",
          flexShrink: 0,
          transition: sidebarTransition(theme, "opacity"),
        }}
      >
        {isGroupOpen ? (
          <ExpandLess sx={{ fontSize: 16 }} />
        ) : (
          <ExpandMore sx={{ fontSize: 16 }} />
        )}
      </IconButton>
    </ListItemButton>
  );

  return (
    <>
      <ListItem
        sx={{
          mb: isGroupOpen ? 0.5 : 2,
          transition: sidebarTransition(theme, "margin-bottom"),
        }}
        disablePadding
      >
        {isExpanded ? (
          button
        ) : (
          <Tooltip title={text} placement="right">
            {button}
          </Tooltip>
        )}
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
              isExpanded={isExpanded}
            />
          ))}
        </List>
      </Collapse>
    </>
  );
};
