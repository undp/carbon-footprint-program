import { Logout } from "@mui/icons-material";
import {
  Menu,
  MenuItem,
  Avatar,
  Divider,
  ListItemIcon,
  Box,
  Card,
  Typography,
} from "@mui/material";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Routes } from "@/interfaces";
import { SystemRole } from "@repo/types";

export const UserMenu = () => {
  const { signOut, user: me, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith(Routes.ADMIN);
  const imAdmin =
    me?.role === SystemRole.ADMIN || me?.role === SystemRole.SUPERADMIN;

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const navigateToHome = useCallback(() => {
    void navigate({
      to: Routes.HOME,
    });
  }, [navigate]);

  const navigateToAdmin = useCallback(() => {
    void navigate({
      to: Routes.ADMIN,
    });
  }, [navigate]);

  const name = me?.firstName ? `${me.firstName} ${me.lastName}` : null;

  if (isLoading || !me) {
    return null;
  }

  return (
    <Box className="mb-4 flex flex-col-reverse gap-4">
      <Card
        elevation={0}
        className="flex items-center gap-2"
        onClick={handleClick}
        sx={{ cursor: "pointer" }}
      >
        <Avatar
          sx={(theme) => ({
            backgroundColor: theme.palette.grey[200],
          })}
        >
          {me.firstName?.charAt(0).toUpperCase()}
        </Avatar>
        <Box className="flex flex-col">
          {name && (
            <Typography variant="body1" lineHeight="normal">
              {name}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {me.email}
          </Typography>
        </Box>
      </Card>
      <Menu
        anchorEl={anchorEl}
        id="account-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              overflow: "visible",
              filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
              mt: 1.5,
              "& .MuiAvatar-root": {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1,
              },
            },
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {imAdmin && !isAdminRoute && (
          <MenuItem onClick={navigateToAdmin}>Ir a admin</MenuItem>
        )}
        {imAdmin && isAdminRoute && (
          <MenuItem onClick={navigateToHome}>Ir a home</MenuItem>
        )}

        <MenuItem onClick={signOut}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Salir
        </MenuItem>
      </Menu>

      <Divider />
    </Box>
  );
};
