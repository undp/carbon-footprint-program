import { FC } from "react";
import { Badge } from "@mui/material";
import { DescriptionOutlined } from "@mui/icons-material";
import { AppActionButton } from "./AppActionButton";

interface HistoryActionButtonProps {
  /** Shows a warning dot overlay when the submission history has an unread review update. */
  hasUpdate: boolean;
  onClick: () => void;
}

/**
 * Action-column button that opens the submission history, with a warning-dot
 * overlay signalling an unread review update. Shared across user-side tables
 * (carbon inventories, reduction projects) so the look stays consistent.
 */
export const HistoryActionButton: FC<HistoryActionButtonProps> = ({
  hasUpdate,
  onClick,
}) => (
  <Badge
    variant="dot"
    invisible={!hasUpdate}
    overlap="circular"
    sx={{
      "& .MuiBadge-badge": {
        top: 2,
        right: 2,
        backgroundColor: (theme) => theme.palette.warning.main,
      },
    }}
  >
    <AppActionButton tooltip="Historial" onClick={onClick}>
      <DescriptionOutlined fontSize="small" />
    </AppActionButton>
  </Badge>
);
