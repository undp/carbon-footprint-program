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

interface Props {
  icon: React.ReactNode;
  text: string;
  path: string;
  selected: boolean;
}

export const Item: FC<Props> = ({ icon, text, path, selected }) => {
  const theme = useTheme();

  const backgroundColor = alpha(theme.palette.secondary.main, 0.2);
  const selectedTextColor = theme.palette.primary.main;

  return (
    <ListItem sx={{ mb: 2 }} disablePadding>
      <ListItemButton
        component={Link}
        to={path}
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
          "&:hover": {
            backgroundColor,
            "& .MuiListItemText-primary": {
              color: selectedTextColor,
              fontWeight: "bold",
            },
            "& .MuiListItemIcon-root": {
              color: selectedTextColor,
            },
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
