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

export interface SidebarItemProps {
  icon: React.ReactNode;
  text: string;
  path?: string;
  selected: boolean;
  disabled?: boolean;
  isChild?: boolean;
}

export const Item: FC<SidebarItemProps> = ({
  icon,
  text,
  path,
  selected,
  disabled,
  isChild,
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
          mx: 1,
          minHeight: isChild ? 36 : 34,
          borderRadius: 34,
          pt: 0.5,
          pb: 0.5,
          mr: 0,
          ml: isChild ? 3 : 0,
          "& .MuiListItemIcon-root": {
            mr: 1,
            minWidth: "unset",
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
        <ListItemText primary={text} />
      </ListItemButton>
    </ListItem>
  );
};
