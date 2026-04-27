import { FC, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Alert,
  Tooltip,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { SystemRole } from "@repo/types";
import type { GetAllUsersResponse } from "@repo/types";
import { useUpdateUserRole } from "@/api/query/users";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { ROLE_LABELS, DIALOG_COPY, TOOLTIP_COPY } from "../constants";

interface ChangeRoleDialogProps {
  open: boolean;
  user: GetAllUsersResponse[number] | null;
  viewerId: string;
  superAdminCount: number;
  onClose: () => void;
}

const ALL_ROLES = [
  SystemRole.USER,
  SystemRole.ADMIN,
  SystemRole.SUPERADMIN,
] as const;

export const ChangeRoleDialog: FC<ChangeRoleDialogProps> = ({
  open,
  user,
  viewerId,
  superAdminCount,
  onClose,
}) => {
  const [selectedRole, setSelectedRole] = useState<SystemRole>(
    user?.role ?? SystemRole.USER
  );
  const { mutate, isPending } = useUpdateUserRole();

  const isOwnRow = user?.id === viewerId;
  const isLastSuperadmin =
    user?.role === SystemRole.SUPERADMIN && superAdminCount <= 1;

  const disabledRoles = useMemo(() => {
    const disabled = new Set<SystemRole>();
    if (isLastSuperadmin) {
      disabled.add(SystemRole.USER);
      disabled.add(SystemRole.ADMIN);
    }
    return disabled;
  }, [isLastSuperadmin]);

  const handleClose = () => {
    setSelectedRole(user?.role ?? SystemRole.USER);
    onClose();
  };

  const handleSubmit = () => {
    if (!user || isOwnRow) return;
    mutate(
      { id: user.id, role: selectedRole },
      {
        onSuccess: () => {
          enqueueSnackbar(DIALOG_COPY.changeRoleSuccess, {
            variant: "success",
          });
          handleClose();
        },
        onError: (error) => {
          enqueueSnackbar(
            getApiErrorMessage(error, "No se pudo cambiar el rol"),
            { variant: "error" }
          );
        },
      }
    );
  };

  const isNoOp = selectedRole === user?.role;
  const submitDisabled = isPending || isOwnRow || isNoOp;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{DIALOG_COPY.changeRoleTitle}</DialogTitle>
      <DialogContent>
        <TextField
          select
          fullWidth
          size="small"
          label={DIALOG_COPY.changeRoleLabel}
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as SystemRole)}
          sx={{ mt: 1 }}
        >
          {ALL_ROLES.map((role) => {
            const isDisabled = disabledRoles.has(role);
            const tooltip = isDisabled ? TOOLTIP_COPY.lastSuperadmin : "";
            return (
              <Tooltip key={role} title={tooltip} placement="right">
                <span>
                  <MenuItem value={role} disabled={isDisabled}>
                    {ROLE_LABELS[role]}
                  </MenuItem>
                </span>
              </Tooltip>
            );
          })}
        </TextField>
        {selectedRole === SystemRole.USER && !isNoOp && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {DIALOG_COPY.demoteWarning}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isPending}>
          {DIALOG_COPY.cancelLabel}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitDisabled}
          color={selectedRole === SystemRole.USER ? "warning" : "primary"}
        >
          {isPending ? "Guardando..." : DIALOG_COPY.changeRoleSubmit}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
