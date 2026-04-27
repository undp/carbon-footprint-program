import { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
  CircularProgress,
  Box,
} from "@mui/material";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useUserRoleHistory } from "@/api/query/users";
import { UserRoleChip } from "./UserRoleChip";
import { DIALOG_COPY } from "../constants";
import { SystemRole } from "@repo/types";

interface UserRoleHistoryDialogProps {
  open: boolean;
  userId: string | null;
  userName: string;
  onClose: () => void;
}

export const UserRoleHistoryDialog: FC<UserRoleHistoryDialogProps> = ({
  open,
  userId,
  userName,
  onClose,
}) => {
  const { data: history, isLoading } = useUserRoleHistory(userId ?? "");

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {DIALOG_COPY.historyTitle} — {userName}
      </DialogTitle>
      <DialogContent>
        {isLoading && (
          <Box className="flex justify-center py-4">
            <CircularProgress size={32} />
          </Box>
        )}
        {!isLoading && history?.length === 0 && (
          <Typography
            color="text.secondary"
            sx={{ py: 2, textAlign: "center" }}
          >
            {DIALOG_COPY.historyEmpty}
          </Typography>
        )}
        {!isLoading && history && history.length > 0 && (
          <List disablePadding>
            {history.map((entry, idx) => {
              const actorName =
                [entry.changedBy.firstName, entry.changedBy.lastName]
                  .filter(Boolean)
                  .join(" ") ||
                entry.changedBy.email ||
                entry.changedBy.id;
              const dateStr = format(
                new Date(entry.createdAt),
                "d MMM yyyy, HH:mm",
                { locale: es }
              );
              return (
                <Box key={entry.id}>
                  {idx > 0 && <Divider />}
                  <ListItem alignItems="flex-start" disableGutters>
                    <ListItemText
                      primary={
                        <Box
                          className="flex items-center gap-2"
                          sx={{ flexWrap: "wrap" }}
                        >
                          <UserRoleChip
                            role={entry.previousRole as SystemRole}
                          />
                          <Typography variant="body2">→</Typography>
                          <UserRoleChip role={entry.newRole as SystemRole} />
                        </Box>
                      }
                      secondary={
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 0.5, display: "block" }}
                        >
                          {dateStr} · por {actorName}
                        </Typography>
                      }
                    />
                  </ListItem>
                </Box>
              );
            })}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{DIALOG_COPY.cancelLabel}</Button>
      </DialogActions>
    </Dialog>
  );
};
