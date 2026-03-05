import { FC } from "react";
import { Box, IconButton, Tooltip, useTheme } from "@mui/material";
import { EditOutlined, DeleteOutlined } from "@mui/icons-material";
import { OrganizationRole } from "@repo/types";

interface OrganizationUserActionsCellProps {
  userId: string;
  userName?: string;
  currentRole?: OrganizationRole;
  isCurrentUser?: boolean;
  onEdit: (userId: string, userName: string, role: OrganizationRole) => void;
  onDelete: (userId: string, userName: string) => void;
}

export const OrganizationUserActionsCell: FC<
  OrganizationUserActionsCellProps
> = ({
  userId,
  userName = "",
  currentRole,
  isCurrentUser = false,
  onEdit,
  onDelete,
}) => {
  const theme = useTheme();

  const editTooltip = isCurrentUser
    ? "No puedes editar tu propio rol"
    : "Editar usuario";
  const deleteTooltip = isCurrentUser
    ? "No puedes eliminarte a ti mismo"
    : "Eliminar usuario";

  const iconBorder = isCurrentUser
    ? theme.palette.grey[300]
    : theme.palette.primary.main;

  const iconButtonStyles = () => ({
    border: `1px solid ${iconBorder}`,
    borderRadius: "4px",
    padding: "4px",
  });

  return (
    <Box className="flex items-center justify-center gap-2">
      <Tooltip title={editTooltip}>
        <span>
          <IconButton
            size="small"
            onClick={() => currentRole && onEdit(userId, userName, currentRole)}
            disabled={isCurrentUser}
            sx={iconButtonStyles}
            color="primary"
            aria-label="Editar usuario"
          >
            <EditOutlined fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={deleteTooltip}>
        <span>
          <IconButton
            size="small"
            onClick={() => onDelete(userId, userName)}
            disabled={isCurrentUser}
            sx={iconButtonStyles}
            color="primary"
            aria-label="Eliminar usuario"
          >
            <DeleteOutlined fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};
