import { FC, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Autocomplete,
  TextField,
  MenuItem,
  Stack,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { SystemRole } from "@repo/types";
import type { GetAllUsersResponse } from "@repo/types";
import { useUpdateUserRole } from "@/api/query/users";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { ROLE_LABELS, DIALOG_COPY } from "../constants";

interface PromoteUserDialogProps {
  open: boolean;
  users: GetAllUsersResponse;
  onClose: () => void;
}

const PROMOTABLE_ROLES = [SystemRole.ADMIN, SystemRole.SUPERADMIN] as const;

export const PromoteUserDialog: FC<PromoteUserDialogProps> = ({
  open,
  users,
  onClose,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<SystemRole>(
    SystemRole.ADMIN
  );
  const { mutate, isPending } = useUpdateUserRole();

  const eligibleUsers = users.filter((u) => u.role === SystemRole.USER);
  const selectedUser =
    eligibleUsers.find((u) => u.id === selectedUserId) ?? null;

  const handleClose = () => {
    setSelectedUserId(null);
    setSelectedRole(SystemRole.ADMIN);
    onClose();
  };

  const handleSubmit = () => {
    if (!selectedUserId) return;
    mutate(
      { id: selectedUserId, role: selectedRole },
      {
        onSuccess: () => {
          enqueueSnackbar(DIALOG_COPY.promoteSuccess, { variant: "success" });
          handleClose();
        },
        onError: (error) => {
          enqueueSnackbar(
            getApiErrorMessage(error, "No se pudo promover el usuario"),
            { variant: "error" }
          );
        },
      }
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{DIALOG_COPY.promoteTitle}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Autocomplete
            options={eligibleUsers}
            getOptionLabel={(u) =>
              [u.firstName, u.lastName].filter(Boolean).join(" ") ||
              u.email ||
              u.id
            }
            value={selectedUser}
            onChange={(_e, v) => setSelectedUserId(v?.id ?? null)}
            renderInput={(params) => (
              <TextField
                {...params}
                label={DIALOG_COPY.promoteUserLabel}
                size="small"
              />
            )}
            noOptionsText="Sin opciones"
          />
          <TextField
            select
            size="small"
            label={DIALOG_COPY.promoteRoleLabel}
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as SystemRole)}
          >
            {PROMOTABLE_ROLES.map((role) => (
              <MenuItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isPending}>
          {DIALOG_COPY.cancelLabel}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isPending || !selectedUserId}
        >
          {isPending ? "Promoviendo..." : DIALOG_COPY.promoteSubmit}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
