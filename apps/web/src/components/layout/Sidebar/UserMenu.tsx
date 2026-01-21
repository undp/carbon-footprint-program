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
import { useState } from "react";

export const UserMenu = () => {
  //TODO: Fetch user data from API
  const { account, signOut, isLoading } = useAuth();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  if (isLoading || !account) {
    return null;
  }

  return (
    <Box className="mb-4 flex flex-1 flex-col-reverse gap-4">
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
          {account.name?.charAt(0).toUpperCase()}
        </Avatar>
        <Box className="flex flex-col">
          <Typography variant="body1" lineHeight="normal">
            {account.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {account.username}
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
        <MenuItem onClick={signOut}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Sign Out
        </MenuItem>
      </Menu>

      <Divider />
    </Box>
  );
};
