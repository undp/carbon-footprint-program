import { FC } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { EditOutlined, DeleteOutlined } from "@mui/icons-material";

interface OrganizationUserActionsCellProps {
  userId: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const OrganizationUserActionsCell: FC<
  OrganizationUserActionsCellProps
> = ({ userId, onEdit, onDelete }) => {
  return (
    <Box className="flex items-center justify-center gap-2">
      <Tooltip title="Editar usuario">
        <IconButton
          size="small"
          onClick={() => onEdit(userId)}
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
      </Tooltip>
      <Tooltip title="Eliminar usuario">
        <IconButton
          size="small"
          onClick={() => onDelete(userId)}
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
      </Tooltip>
    </Box>
  );
};
