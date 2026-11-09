import { FC } from "react";
import { Box, Tooltip } from "@mui/material";
import {
  DeleteOutlined,
  LockOutlined,
  RestoreOutlined,
} from "@mui/icons-material";
import { YearCopyOutcome } from "@repo/utils";
import { AdminActionButton } from "@/components/AdminActionButton";
import type { YearCopyRow } from "../../utils/emissionFactorYearCopy";

interface Props {
  row: YearCopyRow;
  targetYear: number;
  onToggleExclude: (row: YearCopyRow) => void;
}

export const YearCopyRowActionCell: FC<Props> = ({
  row,
  targetYear,
  onToggleExclude,
}) => {
  if (row.outcome === YearCopyOutcome.EXISTS_IN_TARGET) {
    return (
      <Tooltip
        arrow
        placement="top"
        title={`Ya existe en ${targetYear}: no se copia ni se sobrescribe.`}
      >
        <Box className="flex w-full justify-center">
          <LockOutlined fontSize="small" color="disabled" />
        </Box>
      </Tooltip>
    );
  }
  if (row.outcome === YearCopyOutcome.EXCLUDED) {
    return (
      <AdminActionButton
        icon={RestoreOutlined}
        tooltip="Volver a incluir en la copia"
        color="primary"
        onClick={() => onToggleExclude(row)}
      />
    );
  }
  return (
    <AdminActionButton
      icon={DeleteOutlined}
      tooltip="Quitar de la copia"
      onClick={() => onToggleExclude(row)}
    />
  );
};
