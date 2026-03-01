import { FC } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { EditOutlined, DeleteOutlined } from "@mui/icons-material";

interface OrganizationUserActionsCellProps {
  userId: string;
  userName?: string;
  currentRole?: string;
  isCurrentUser?: boolean;
  onEdit: (userId: string, userName: string, role: string) => void;
  onDelete: (userId: string, userName: string) => void;
}

export const OrganizationUserActionsCell: FC<
  OrganizationUserActionsCellProps
> = ({
  userId,
  userName = "",
  currentRole = "",
  isCurrentUser = false,
  onEdit,
  onDelete,
}) => {
  const editDisabled = isCurrentUser;
  const deleteDisabled = isCurrentUser;

  const editTooltip = editDisabled
    ? "No puedes editar tu propio rol"
    : "Editar usuario";
  const deleteTooltip = deleteDisabled
    ? "No puedes eliminarte a ti mismo"
    : "Eliminar usuario";

  return (
    <Box className="flex items-center justify-center gap-2">
      <Tooltip title={editTooltip}>
        <span>
          <IconButton
            size="small"
            onClick={() => onEdit(userId, userName, currentRole)}
            disabled={editDisabled}
            sx={(theme) => ({
              border: `1px solid ${theme.palette.primary.main}`,
              borderRadius: "4px",
              padding: "4px",
            })}
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
            disabled={deleteDisabled}
            sx={(theme) => ({
              border: `1px solid ${theme.palette.primary.main}`,
              borderRadius: "4px",
              padding: "4px",
            })}
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
