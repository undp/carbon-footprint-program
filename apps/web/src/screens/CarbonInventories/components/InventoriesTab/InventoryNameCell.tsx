import { FC } from "react";
import { Box, Chip, Tooltip, Typography, useTheme } from "@mui/material";
import { TaskAltRounded, GppGoodOutlined } from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import {
  CarbonInventoryDisplayStatus,
  CarbonInventoryDisplayStatusEnum,
} from "@repo/types";

const DIPLOMA_STATUSES: CarbonInventoryDisplayStatus[] = [
  CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED,
  CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_VERIFICATION,
  CarbonInventoryDisplayStatusEnum.VERIFICATION_REVIEWED,
  CarbonInventoryDisplayStatusEnum.VERIFICATION_REJECTED,
  CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED,
];

interface InventoryNameCellProps {
  name: string | null;
  status: CarbonInventoryDisplayStatus;
}

export const InventoryNameCell: FC<InventoryNameCellProps> = ({
  name,
  status,
}) => {
  const theme = useTheme();

  const hasDiploma = DIPLOMA_STATUSES.includes(status);
  const hasSello =
    status === CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 0.75,
        py: 1,
      }}
    >
      {name ? (
        <Tooltip title={name}>
          <Typography variant="body2" noWrap>
            {name}
          </Typography>
        </Tooltip>
      ) : (
        <Typography color="textDisabled" className="italic" variant="body2">
          (sin nombre)
        </Typography>
      )}
      {(hasDiploma || hasSello) && (
        <Box sx={{ display: "flex", gap: 1 }}>
          {hasDiploma && (
            <Chip
              icon={
                <TaskAltRounded
                  sx={{
                    fontSize: 14,
                    color: `${theme.palette.success.main} !important`,
                  }}
                />
              }
              label="Diploma"
              size="small"
              sx={{
                height: 22,
                borderRadius: "4px",
                backgroundColor: alpha(theme.palette.success.main, 0.1),
                border: `1px solid ${alpha(theme.palette.success.main, 0.4)}`,
                color: theme.palette.success.main,
                fontWeight: 500,
                "& .MuiChip-icon": { ml: 0.5 },
              }}
            />
          )}
          {hasSello && (
            <Chip
              icon={
                <GppGoodOutlined
                  sx={{
                    fontSize: 14,
                    color: `${theme.palette.common.glossyTeal} !important`,
                  }}
                />
              }
              label="Sello"
              size="small"
              sx={{
                height: 22,
                borderRadius: "4px",
                backgroundColor: alpha(theme.palette.secondary.main, 0.15),
                border: `1px solid ${alpha(theme.palette.secondary.main, 0.5)}`,
                color: theme.palette.common.glossyTeal,
                fontWeight: 500,
                "& .MuiChip-icon": { ml: 0.5 },
              }}
            />
          )}
        </Box>
      )}
    </Box>
  );
};
