import { FC } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import {
  CheckCircleRounded,
  FiberManualRecordRounded,
  SyncRounded,
} from "@mui/icons-material";
import type { SvgIconComponent } from "@mui/icons-material";

type SaveStatus = "saving" | "unsaved" | "saved";

interface SaveStatusConfig {
  label: string;
  tooltip: string;
  color: string;
  Icon: SvgIconComponent;
  iconFontSize: number;
}

const SAVE_STATUS_CONFIG: Record<SaveStatus, SaveStatusConfig> = {
  saving: {
    label: "Guardando cambios…",
    tooltip: "Estamos guardando tus cambios.",
    color: "text.secondary",
    Icon: SyncRounded,
    iconFontSize: 16,
  },
  unsaved: {
    label: "Cambios sin guardar",
    tooltip:
      "Tienes cambios que aún no se han guardado. Presiona «Guardar» para conservarlos.",
    color: "warning.main",
    Icon: FiberManualRecordRounded,
    iconFontSize: 10,
  },
  saved: {
    label: "Sin cambios pendientes",
    tooltip: "No hay cambios por guardar: todo está guardado.",
    color: "success.main",
    Icon: CheckCircleRounded,
    iconFontSize: 16,
  },
};

const resolveSaveStatus = (isDirty: boolean, isSaving: boolean): SaveStatus => {
  if (isSaving) return "saving";
  if (isDirty) return "unsaved";
  return "saved";
};

interface SaveStatusIndicatorProps {
  isDirty: boolean;
  isSaving: boolean;
}

export const SaveStatusIndicator: FC<SaveStatusIndicatorProps> = ({
  isDirty,
  isSaving,
}) => {
  const { label, tooltip, color, Icon, iconFontSize } =
    SAVE_STATUS_CONFIG[resolveSaveStatus(isDirty, isSaving)];

  return (
    <Tooltip title={tooltip}>
      <Box className="flex flex-row items-center gap-1.5">
        <Icon sx={{ color, fontSize: iconFontSize }} />
        <Typography variant="body2" color={color} noWrap>
          {label}
        </Typography>
      </Box>
    </Tooltip>
  );
};
