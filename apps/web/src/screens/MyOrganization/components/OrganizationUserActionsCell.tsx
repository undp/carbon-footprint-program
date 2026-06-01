import { FC } from "react";
import { Box } from "@mui/material";
import { EditOutlined, DeleteOutlined } from "@mui/icons-material";
import { OrganizationRole } from "@repo/types";
import { AppActionButton } from "@/components";

interface OrganizationUserActionsCellProps {
  userId: string;
  userEmail?: string | null;
  currentRole?: OrganizationRole;
  isCurrentUser?: boolean;
  onEdit: (userId: string, userEmail: string, role: OrganizationRole) => void;
  onDelete: (userId: string, userEmail: string) => void;
}

export const OrganizationUserActionsCell: FC<
  OrganizationUserActionsCellProps
> = ({
  userId,
  userEmail = "",
  currentRole,
  isCurrentUser = false,
  onEdit,
  onDelete,
}) => {
  const editTooltip = isCurrentUser
    ? "No puedes editar tu propio rol"
    : "Editar usuario";
  const deleteTooltip = isCurrentUser
    ? "No puedes eliminarte a ti mismo"
    : "Eliminar usuario";

  return (
    <Box className="flex items-center justify-center gap-2">
      <AppActionButton
        tooltip={editTooltip}
        onClick={() =>
          currentRole && onEdit(userId, userEmail ?? "", currentRole)
        }
        disabled={isCurrentUser}
        aria-label="Editar usuario"
      >
        <EditOutlined fontSize="small" />
      </AppActionButton>
      <AppActionButton
        tooltip={deleteTooltip}
        onClick={() => onDelete(userId, userEmail ?? "")}
        disabled={isCurrentUser}
        aria-label="Eliminar usuario"
      >
        <DeleteOutlined fontSize="small" />
      </AppActionButton>
    </Box>
  );
};
