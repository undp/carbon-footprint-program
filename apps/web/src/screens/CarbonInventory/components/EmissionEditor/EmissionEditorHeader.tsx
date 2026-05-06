import { FC, useCallback, useMemo } from "react";
import { WarningRounded } from "@mui/icons-material";
import {
  Box,
  Avatar,
  Typography,
  FormControlLabel,
  Checkbox,
  Skeleton,
} from "@mui/material";
import { InfoButton, NumericInput } from "@/components";
import { formatter } from "@/utils/formatting";
import { kgToTon } from "@/utils/number";
import { GetCarbonInventoryMethodologyResponse } from "@repo/types";
import { EmissionEditorActionsCell } from "./cells/EmissionEditorActionsCell";
import { useExplanationDialog } from "@/contexts";
import { CATEGORY_ICON_MAP } from "@/utils/categoryIcons";
import { getColorPalette } from "@/utils/categoryColors";

type Subcategory =
  GetCarbonInventoryMethodologyResponse["categories"][number]["subcategories"][number];

interface EmissionEditorHeaderProps
  extends Pick<Subcategory, "name" | "description" | "explanation" | "icon"> {
  categoryColor: string;
  isTotalManualEmissionsModeAvailable: boolean;
  totalEmission: number;
  manualTotalEmissionValue: number | null;
  setTotalEmission: (value: number | null) => void;
  isTotalManualEmissionsModeActive: boolean;
  setIsTotalManualEmissionsMode: (value: boolean) => Promise<void>;
  isManualModeLoading?: boolean;
  hasManualModeLine?: boolean;
  manualModeLineHasComment?: boolean;
  onManualModeLineDelete?: () => void;
  onManualModeLineComment?: () => void;
  hasEmissionFactors?: boolean;
}

export const EmissionEditorHeader: FC<EmissionEditorHeaderProps> = ({
  name,
  description,
  explanation,
  icon,
  categoryColor,
  isTotalManualEmissionsModeAvailable,
  totalEmission,
  manualTotalEmissionValue,
  setTotalEmission,
  isTotalManualEmissionsModeActive,
  setIsTotalManualEmissionsMode,
  isManualModeLoading = false,
  hasManualModeLine = false,
  manualModeLineHasComment = false,
  onManualModeLineDelete,
  onManualModeLineComment,
  hasEmissionFactors,
}) => {
  const { openExplanationContent } = useExplanationDialog();
  const IconComponent = CATEGORY_ICON_MAP[icon];
  const categoryColorPalette = useMemo(
    () => getColorPalette(categoryColor),
    [categoryColor]
  );
  const onChangeTotalEmission = useCallback(
    (value: number | null) => {
      setTotalEmission(value);
    },
    [setTotalEmission]
  );

  return (
    <Box className="flex h-20 gap-4">
      <Box className="flex flex-1 flex-row items-center gap-2">
        <Avatar
          sx={{
            backgroundColor: categoryColorPalette.light,
            width: 48,
            height: 48,
          }}
        >
          {IconComponent ? (
            <IconComponent sx={{ color: categoryColorPalette.dark }} />
          ) : null}
        </Avatar>
        <Box className="flex flex-col">
          <Box className="flex flex-row items-center gap-2">
            <Typography variant="subtitle1" fontWeight="medium">
              {name}
            </Typography>
            <InfoButton
              label="Más información de la subcategoría"
              onClick={(e) => {
                e.stopPropagation();
                openExplanationContent(explanation);
              }}
            />
          </Box>
          <Typography variant="caption" fontWeight="regular">
            {description}
          </Typography>

          {!hasEmissionFactors && (
            <Box className="items-bottom flex gap-1">
              <WarningRounded
                sx={(theme) => ({
                  color: theme.palette.warning.main,
                  height: 18,
                  width: 18,
                })}
              />
              <Typography
                variant="caption"
                fontWeight="regular"
                color="warning"
              >
                Esta subcategoría no tiene factores de emisión disponibles
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
      <Box className="flex flex-row content-center items-center gap-2">
        {/* Case 1: Loading and activating manual mode (Skeleton) */}
        {isManualModeLoading && isTotalManualEmissionsModeActive && (
          <Skeleton variant="rectangular" width={200} height={30} />
        )}

        {/* Case 2: Manual mode active and not loading (Input) */}
        {!isManualModeLoading && isTotalManualEmissionsModeActive && (
          <>
            <NumericInput
              label="Emisiones"
              value={manualTotalEmissionValue}
              onChange={onChangeTotalEmission}
              placeholder=""
              min={0}
              sx={{
                minHeight: 40,
                height: 40,
              }}
            />
            <Typography variant="subtitle1" fontWeight="bold">
              (tCO₂e)
            </Typography>
          </>
        )}

        {/* Case 3: Loading and deactivating manual mode (Shows 0) */}
        {isManualModeLoading && !isTotalManualEmissionsModeActive && (
          <Typography variant="subtitle1" fontWeight="bold">
            0 (tCO₂e)
          </Typography>
        )}

        {/* Case 4: Detailed mode active and not loading (Shows the real total) */}
        {!isManualModeLoading && !isTotalManualEmissionsModeActive && (
          <Typography variant="subtitle1" fontWeight="bold">
            {formatter.emissions(kgToTon(totalEmission))}
          </Typography>
        )}
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
              checked={isTotalManualEmissionsModeActive}
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
      {/* Action buttons for manual mode line */}
      {isTotalManualEmissionsModeActive && hasManualModeLine && (
        <Box className="flex items-center">
          <EmissionEditorActionsCell
            rowId="manual-mode-line"
            categoryColor={categoryColor}
            disabled={isManualModeLoading}
            hasComment={manualModeLineHasComment}
            uploadFiles={() => null}
            updateComment={onManualModeLineComment}
            deleteSource={onManualModeLineDelete}
          />
        </Box>
      )}
    </Box>
  );
};
