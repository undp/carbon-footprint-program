import { FC } from "react";
import {
  ListItem,
  ListItemButton,
  alpha,
  ListItemIcon,
  ListItemText,
  useTheme,
} from "@mui/material";
import { Link } from "@tanstack/react-router";
import { sidebarTransition } from "@/theme";
import { OverflowTooltipText } from "@/components/OverflowTooltipText";

export interface SidebarItemProps {
  icon: React.ReactNode;
  text: string;
  path?: string;
  selected: boolean;
  disabled?: boolean;
  isChild?: boolean;
  isExpanded?: boolean;
}

export const Item: FC<SidebarItemProps> = ({
  icon,
  text,
  path,
  selected,
  disabled,
  isChild,
  isExpanded = true,
}) => {
  const theme = useTheme();

  const backgroundColor = alpha(theme.palette.secondary.main, 0.2);
  const selectedTextColor = theme.palette.primary.main;

  return (
    <ListItem sx={{ mb: isChild ? 0.5 : 2 }} disablePadding>
      <ListItemButton
        component={Link}
        to={path}
        disabled={disabled}
        sx={{
          minHeight: isChild ? 36 : 34,
          borderRadius: 34,
          py: 0.5,
          px: 2,
          ml: isChild ? 3 : 0,
          mr: 0,
          justifyContent: "flex-start",
          "& .MuiListItemIcon-root": {
            mr: 1,
            minWidth: 0,
            justifyContent: "center",
          },
          "& .MuiListItemText-primary": {
            mt: 0,
            mb: 0,
            ...(isChild ? { fontSize: 13 } : {}),
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
        selected={selected}
      >
        <ListItemIcon>{icon}</ListItemIcon>
        <ListItemText
          primary={
            <OverflowTooltipText variant="body1">{text}</OverflowTooltipText>
          }
          slotProps={{ primary: { noWrap: true } }}
          sx={{
            opacity: isExpanded ? 1 : 0,
            width: isExpanded ? "auto" : 0,
            overflow: "hidden",
            transition: sidebarTransition(theme, ["opacity", "width"]),
          }}
        />
      </ListItemButton>
    </ListItem>
  );
};
