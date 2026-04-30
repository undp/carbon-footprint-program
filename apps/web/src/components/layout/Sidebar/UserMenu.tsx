import {
  AdminPanelSettingsOutlined,
  HomeOutlined,
  Logout,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Card,
  Divider,
  IconButton,
  Tooltip,
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

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleToggleArea = useCallback(() => {
    void navigate({
      to: isAdminRoute ? Routes.HOME : Routes.ADMIN_DASHBOARD,
    });
  }, [navigate, isAdminRoute]);

  const openLogoutDialog = useCallback(() => {
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
    ? "Volver a la aplicación"
    : "Ir al panel de administración";
  const ToggleIcon = isAdminRoute ? HomeOutlined : AdminPanelSettingsOutlined;

  return (
    <Box className="mb-4 flex flex-col gap-3">
      <Divider />

      <Card
        elevation={0}
        sx={(theme) => ({
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 1,
          backgroundColor: theme.palette.grey[50],
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
        })}
      >
        <Avatar
          sx={(theme) => ({
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            width: 40,
            height: 40,
          })}
        >
          {me.firstName?.charAt(0).toUpperCase()}
        </Avatar>
        <Box className="flex min-w-0 flex-1 flex-col">
          {name && (
            <Typography
              variant="body2"
              fontWeight={600}
              lineHeight={1.2}
              noWrap
            >
              {name}
            </Typography>
          )}
          <Tooltip title={me.email} placement="top">
            <Typography variant="caption" color="text.secondary" noWrap>
              {me.email}
            </Typography>
          </Tooltip>
        </Box>
        <Tooltip title="Cerrar sesión" placement="top">
          <IconButton
            size="small"
            onClick={openLogoutDialog}
            aria-label="Cerrar sesión"
            sx={(theme) => ({
              color: theme.palette.error.main,
              "&:hover": {
                backgroundColor: theme.palette.error.light,
                color: theme.palette.error.contrastText,
              },
            })}
          >
            <Logout fontSize="small" />
          </IconButton>
        </Tooltip>
      </Card>

      {imAdmin && (
        <Button
          variant="outlined"
          size="small"
          fullWidth
          onClick={handleToggleArea}
          startIcon={<ToggleIcon />}
          aria-label={toggleLabel}
        >
          {toggleLabel}
        </Button>
      )}

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
    </Box>
  );
};
