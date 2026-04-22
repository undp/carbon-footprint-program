import { FC } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import type { BadgeDTO } from "@repo/types";
import { BadgeHistoryItem } from "./BadgeHistoryItem";

interface BadgeHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  history: BadgeDTO[];
  newlyUploadedId: string | undefined;
  disabled: boolean;
  onActivate: (badge: BadgeDTO) => void;
}

export const BadgeHistoryDialog: FC<BadgeHistoryDialogProps> = ({
  open,
  onClose,
  history,
  newlyUploadedId,
  disabled,
  onActivate,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Historial de sellos</DialogTitle>
    <DialogContent>
      {history.length === 0 ? (
        <Box sx={{ py: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Aún no hay sellos inactivos en el historial.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {history.map((badge) => (
            <BadgeHistoryItem
              key={badge.id}
              badge={badge}
              highlight={badge.id === newlyUploadedId}
              disabled={disabled}
              onActivate={onActivate}
            />
          ))}
        </Stack>
      )}
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onClose}>Cerrar</Button>
    </DialogActions>
  </Dialog>
);
