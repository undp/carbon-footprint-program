import { FC, useCallback, useMemo } from "react";
import { WarningRounded } from "@mui/icons-material";
import {
  Box,
  Avatar,
  Typography,
  FormControlLabel,
  Checkbox,
  Skeleton,
  Tooltip,
} from "@mui/material";
import { InfoButton, NumericInput, OverflowTooltipText } from "@/components";
import { onboardingTargetProps } from "@/utils/onboardingHighlight";
import { formatter } from "@/utils/formatting";
import { kgToTon } from "@/utils/number";
import { GetCarbonInventoryMethodologyResponse } from "@repo/types";
import { EmissionEditorActionsCell } from "./cells/EmissionEditorActionsCell";
import { useExplanationDialog } from "@/contexts";
import { CATEGORY_ICON_MAP } from "@/utils/categoryIcons";
import { getColorPalette } from "@/utils/categoryColors";

type Subcategory =
  GetCarbonInventoryMethodologyResponse["categories"][number]["subcategories"][number];

interface EmissionEditorHeaderProps extends Pick<
  Subcategory,
  "name" | "description" | "explanation" | "icon"
> {
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
  onManualModeLineUploadFiles?: () => void;
  manualModeLinePendingFilesCount?: number;
  manualModeLineLinkedFilesCount?: number;
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
  onManualModeLineUploadFiles,
  manualModeLinePendingFilesCount = 0,
  manualModeLineLinkedFilesCount = 0,
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
      <Box className="flex min-w-0 flex-1 flex-row items-center gap-4">
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
        <Box className="flex min-w-0 flex-1 flex-col">
          <Box className="flex flex-row items-center gap-1">
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
            {!hasEmissionFactors && (
              <Tooltip
                title="No hay factores precargados disponibles para esta subcategoría. Puedes ingresar un factor propio o registrar el total de emisiones"
                placement="top"
              >
                <WarningRounded
                  sx={(theme) => ({
                    color: theme.palette.warning.main,
                    height: 24,
                  })}
                />
              </Tooltip>
            )}
          </Box>
          <OverflowTooltipText
            variant="caption"
            fontWeight="regular"
            lineHeight={1.35}
            lines={2}
          >
            {description}
          </OverflowTooltipText>
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
          // Tag only when actually available/visible: the wrapper Box above is
          // merely hidden (not unmounted) when unavailable, so an unconditional
          // tag would let the spotlight resolver pick a display:none checkbox
          // from an earlier subcategory.
          {...(isTotalManualEmissionsModeAvailable
            ? onboardingTargetProps("emission-capture-expert-mode")
            : {})}
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
            uploadFiles={onManualModeLineUploadFiles}
            updateComment={onManualModeLineComment}
            deleteSource={onManualModeLineDelete}
            pendingFilesCount={manualModeLinePendingFilesCount}
            linkedFilesCount={manualModeLineLinkedFilesCount}
          />
        </Box>
      )}
    </Box>
  );
};
