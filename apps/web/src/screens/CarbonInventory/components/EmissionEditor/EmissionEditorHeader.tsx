import { FC, useCallback } from "react";
import { Folder, InfoOutline } from "@mui/icons-material";
import {
  Box,
  Avatar,
  Typography,
  IconButton,
  FormControlLabel,
  Checkbox,
  alpha,
  Skeleton,
} from "@mui/material";
import { NumericInput } from "@/components";
import { Subcategory } from "@repo/types";

interface EmissionEditorHeaderProps
  extends Pick<Subcategory, "name" | "description"> {
  isTotalManualEmissionsModeAvailable: boolean;
  totalEmission: number;
  setTotalEmission: (value: number) => void;
  isTotalManualEmissionsMode: boolean;
  setIsTotalManualEmissionsMode: (value: boolean) => Promise<void>;
  isManualModeLoading?: boolean;
}

export const EmissionEditorHeader: FC<EmissionEditorHeaderProps> = ({
  name,
  description,
  isTotalManualEmissionsModeAvailable,
  totalEmission,
  setTotalEmission,
  isTotalManualEmissionsMode,
  setIsTotalManualEmissionsMode,
  isManualModeLoading = false,
}) => {
  const onChangeTotalEmission = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTotalEmission(Number(e.target.value));
    },
    [setTotalEmission]
  );

  return (
    <Box className="flex h-20 gap-4">
      <Box className="flex flex-1 flex-row items-center gap-2">
        <Avatar
          sx={(theme) => ({
            backgroundColor: alpha(theme.palette.grey[300], 0.3),
            width: 48,
            height: 48,
          })}
        >
          <Folder sx={{ color: "text.primary" }} />
        </Avatar>
        <Box className="flex flex-col">
          <Box className="flex flex-row items-center">
            <Typography variant="subtitle1" fontWeight="medium">
              {name}
            </Typography>
            <IconButton aria-label="source-info" size="small">
              <InfoOutline fontSize="inherit" />
            </IconButton>
          </Box>

          <Typography variant="caption" fontWeight="regular">
            {description}
          </Typography>
        </Box>
        <Box className="flex flex-col"></Box>
      </Box>

      <Box className="flex flex-row content-center items-center gap-2">
        {/* Case 1: Loading and activating manual mode (Skeleton) */}
        {isManualModeLoading && isTotalManualEmissionsMode && (
          <Skeleton variant="rectangular" width={200} height={30} />
        )}

        {/* Case 2: Manual mode active and not loading (Input) */}
        {!isManualModeLoading && isTotalManualEmissionsMode && (
          <NumericInput
            label="Emisiones"
            value={totalEmission ?? 0}
            onChange={onChangeTotalEmission}
            sx={{
              minHeight: 40,
              height: 40,
            }}
          />
        )}

        {/* Case 3: Loading and deactivating manual mode (Shows 0) */}
        {isManualModeLoading && !isTotalManualEmissionsMode && (
          <Typography variant="subtitle1" fontWeight="bold">
            0
          </Typography>
        )}

        {/* Case 4: Detailed mode active and not loading (Shows the real total) */}
        {!isManualModeLoading && !isTotalManualEmissionsMode && (
          <Typography variant="subtitle1" fontWeight="bold">
            {totalEmission}
          </Typography>
        )}

        <Typography variant="subtitle1" fontWeight="bold">
          (tCO₂e)
        </Typography>
      </Box>

      <Box
        className={`align-end flex-row-reverse items-center gap-2 ${
          isTotalManualEmissionsModeAvailable ? "flex" : "hidden"
        }`}
      >
        <FormControlLabel
          control={
            <Checkbox
              sx={{
                padding: 1,
              }}
              checked={isTotalManualEmissionsMode}
              onChange={(e) =>
                void setIsTotalManualEmissionsMode(e.target.checked)
              }
              disabled={isManualModeLoading}
            />
          }
          label={
            <Typography variant="body2" fontWeight="regular">
              Sólo quiero ingresar el total de emisiones
            </Typography>
          }
        />
      </Box>
    </Box>
  );
};
