import {
  HomeOutlined,
  KeyboardArrowDown,
  LogoutOutlined,
  SettingsOutlined,
} from "@mui/icons-material";
import {
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Routes } from "@/interfaces";
import { SystemRole } from "@repo/types";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const UserMenu = () => {
  const { signOut, user: me, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith(Routes.ADMIN);
  const imAdmin =
    me?.role === SystemRole.ADMIN || me?.role === SystemRole.SUPERADMIN;

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const open = Boolean(anchorEl);

  const handleOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleToggleArea = useCallback(() => {
    setAnchorEl(null);
    void navigate({
      to: isAdminRoute ? Routes.HOME : Routes.ADMIN_DASHBOARD,
    });
  }, [navigate, isAdminRoute]);

  const openLogoutDialog = useCallback(() => {
    setAnchorEl(null);
    setLogoutDialogOpen(true);
  }, []);

  const closeLogoutDialog = useCallback(() => {
    setLogoutDialogOpen(false);
  }, []);

  const confirmLogout = useCallback(() => {
    setLogoutDialogOpen(false);
    void signOut();
  }, [signOut]);

  if (isLoading || !me) {
    return null;
  }

  const name = me.firstName ? `${me.firstName} ${me.lastName}` : null;
  const toggleLabel = isAdminRoute
    ? "Ir a la aplicación"
    : "Ir a administración";
  const ToggleIcon = isAdminRoute ? HomeOutlined : SettingsOutlined;

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={handleOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? "user-menu" : undefined}
        sx={(theme) => ({
          all: "unset",
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.25,
          py: 1,
          borderRadius: 1,
          cursor: "pointer",
          backgroundColor: open ? theme.palette.action.selected : "transparent",
          transition: theme.transitions.create("background-color"),
          "&:hover": {
            backgroundColor: theme.palette.action.hover,
          },
          "&:focus-visible": {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
        })}
      >
        <Box className="flex min-w-0 flex-1 flex-col items-start">
          {name && (
            <Typography
              variant="body2"
              fontWeight={600}
              lineHeight={1.2}
              noWrap
              sx={{ width: "100%", textAlign: "left" }}
            >
              {name}
            </Typography>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{ width: "100%", textAlign: "left" }}
          >
            {me.email}
          </Typography>
        </Box>
        <KeyboardArrowDown
          fontSize="small"
          sx={(theme) => ({
            color: theme.palette.text.secondary,
            transition: theme.transitions.create("transform"),
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          })}
        />
      </Box>

      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ horizontal: "left", vertical: "top" }}
        transformOrigin={{ horizontal: "left", vertical: "bottom" }}
        slotProps={{
          paper: {
            elevation: 3,
            sx: {
              minWidth: 240,
              mt: -1,
              borderRadius: 1,
              overflow: "hidden",
            },
          },
          list: { sx: { py: 0.5 } },
        }}
      >
        {imAdmin && [
          <MenuItem key="toggle-area" onClick={handleToggleArea}>
            <ListItemIcon>
              <ToggleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={toggleLabel} />
          </MenuItem>,
          <Divider key="toggle-divider" />,
        ]}

        <MenuItem
          onClick={openLogoutDialog}
          sx={(theme) => ({
            color: theme.palette.error.main,
            "& .MuiListItemIcon-root": { color: theme.palette.error.main },
            "&:hover": {
              backgroundColor: theme.palette.error.light,
              color: theme.palette.error.contrastText,
              "& .MuiListItemIcon-root": {
                color: theme.palette.error.contrastText,
              },
            },
          })}
        >
          <ListItemIcon>
            <LogoutOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Cerrar sesión" />
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={logoutDialogOpen}
        onClose={closeLogoutDialog}
        onConfirm={confirmLogout}
        title="Cerrar sesión"
        message="¿Estás seguro de que quieres cerrar sesión?"
        variant="error"
        confirmLabel="Cerrar sesión"
        cancelLabel="Cancelar"
      />
    </>
  );
};
