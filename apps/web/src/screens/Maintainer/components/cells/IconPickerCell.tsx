import { FC, useState, useEffect, useRef, type ComponentType } from "react";
import {
  Box,
  IconButton,
  Popover,
  Typography,
  Divider,
  type SvgIconProps,
  useTheme,
  alpha,
} from "@mui/material";
import { CheckOutlined } from "@mui/icons-material";
import {
  FactoryOutlined,
  BoltOutlined,
  LocalShippingOutlined,
  WhatshotOutlined,
  DirectionsCarOutlined,
  AcUnitOutlined,
  WaterDropOutlined,
  RecyclingOutlined,
  AgricultureOutlined,
  BusinessOutlined,
  FlightOutlined,
  TrainOutlined,
  ElectricBoltOutlined,
  SolarPowerOutlined,
  ForestOutlined,
  DeleteOutlineOutlined,
  ConstructionOutlined,
  ScienceOutlined,
  LocalGasStationOutlined,
  PublicOutlined,
} from "@mui/icons-material";
import { useFormContext, useFormState } from "react-hook-form";
import { getNestedError } from "./cellUtils";

/** Map of icon names to MUI icon components */
export const CATEGORY_ICON_MAP: Record<string, ComponentType<SvgIconProps>> = {
  FACTORY: FactoryOutlined,
  BOLT: BoltOutlined,
  TRUCK: LocalShippingOutlined,
  FLAME: WhatshotOutlined,
  CAR: DirectionsCarOutlined,
  SNOWFLAKE: AcUnitOutlined,
  WATER: WaterDropOutlined,
  RECYCLE: RecyclingOutlined,
  AGRICULTURE: AgricultureOutlined,
  BUILDING: BusinessOutlined,
  FLIGHT: FlightOutlined,
  TRAIN: TrainOutlined,
  ELECTRIC: ElectricBoltOutlined,
  SOLAR: SolarPowerOutlined,
  FOREST: ForestOutlined,
  WASTE: DeleteOutlineOutlined,
  CONSTRUCTION: ConstructionOutlined,
  SCIENCE: ScienceOutlined,
  FUEL: LocalGasStationOutlined,
  GLOBE: PublicOutlined,
};

const ICON_ENTRIES = Object.entries(CATEGORY_ICON_MAP);

/** Predefined color palette for category icons */
export const CATEGORY_COLORS = [
  "#F5E6D3", // beige
  "#C5DEF0", // light blue
  "#D4E8DC", // mint green
  "#F9D5D5", // light pink
  "#E8D5F5", // lavender
  "#FFF3C4", // light yellow
  "#D5F0E8", // seafoam
  "#FFE0C4", // peach
  "#D5E8F5", // sky blue
  "#E8E8E8", // light gray
  "#C4E8D0", // pale green
  "#F0D5E8", // rose
];

interface IconPickerCellProps {
  iconName: string;
  color: string;
  isEditing: boolean;
  rowIndex: number;
  formArrayName: string;
  onChangeIcon: (iconName: string) => void;
  onChangeColor?: (color: string) => void;
  onClick?: () => void;
  /** When true, hides the color picker section and uses a neutral background */
  hideColor?: boolean;
}

export const IconPickerCell: FC<IconPickerCellProps> = ({
  iconName,
  color,
  isEditing,
  rowIndex,
  formArrayName,
  onChangeIcon,
  onChangeColor,
  onClick,
  hideColor = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const pendingAnchorRef = useRef<HTMLElement | null>(null);
  const theme = useTheme();

  // Defer popover open until isEditing is true; avoids opening before the row enters edit mode.
  useEffect(() => {
    if (isEditing && pendingAnchorRef.current) {
      setAnchorEl(pendingAnchorRef.current);
      pendingAnchorRef.current = null;
    } else if (!isEditing) {
      pendingAnchorRef.current = null;
    }
  }, [isEditing]);

  const { control } = useFormContext();
  const { errors } = useFormState({ control });
  const iconError = getNestedError(
    errors as unknown as Record<string, unknown>,
    formArrayName,
    rowIndex,
    "icon"
  );
  const colorError = hideColor
    ? undefined
    : getNestedError(
        errors as unknown as Record<string, unknown>,
        formArrayName,
        rowIndex,
        "color"
      );
  const hasError = isEditing && (!!iconError || !!colorError);

  const IconComponent = iconName ? CATEGORY_ICON_MAP[iconName] : null;
  const isInteractive = isEditing || !!onClick;
  const effectiveColor = hideColor ? "#E8E8E8" : color;

  return (
    <>
      <IconButton
        size="small"
        disableRipple
        disabled={!isInteractive}
        onClick={(e) => {
          if (isEditing) {
            setAnchorEl(e.currentTarget);
          } else if (onClick) {
            pendingAnchorRef.current = e.currentTarget;
            onClick();
          }
        }}
        sx={
          IconComponent
            ? {
                backgroundColor: effectiveColor || "transparent",
                width: 40,
                height: 40,
                cursor: isInteractive ? "pointer" : "default",
                "&:hover": {
                  backgroundColor: effectiveColor || "transparent",
                  opacity: isInteractive ? 0.8 : 1,
                },
                "&.Mui-disabled": {
                  backgroundColor: effectiveColor || "transparent",
                },
                ...(hasError && {
                  border: "2px dashed",
                  borderColor: "error.main",
                }),
              }
            : {
                width: 40,
                height: 40,
                cursor: isInteractive ? "pointer" : "default",
                border: "2px dashed",
                borderColor: hasError ? "error.main" : "grey.400",
                backgroundColor: "transparent",
                "&:hover": { opacity: isInteractive ? 0.7 : 1 },
                "&.Mui-disabled": { borderColor: "grey.300" },
              }
        }
      >
        {IconComponent && (
          <IconComponent
            fontSize="small"
            sx={{ color: "rgba(0, 0, 0, 0.7)" }}
          />
        )}
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <Box sx={{ p: 1.5, width: 260 }}>
          <Typography
            variant="caption"
            color={iconError ? "error" : "text.secondary"}
            sx={{ mb: 0.5, display: "block" }}
          >
            Ícono{iconError ? ` — ${iconError.message}` : ""}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 0.5,
              mb: 1,
              p: 0.5,
              borderRadius: 1,
              border: iconError ? "1px solid" : "none",
              borderColor: "error.main",
            }}
          >
            {ICON_ENTRIES.map(([name, Icon]) => (
              <IconButton
                key={name}
                size="small"
                disableRipple
                onClick={() => onChangeIcon(name)}
                sx={{
                  borderRadius: 1,
                  backgroundColor:
                    name === iconName
                      ? alpha(theme.palette.primary.main, 0.3)
                      : "transparent",
                  "&:hover": { backgroundColor: "grey.200" },
                }}
              >
                <Icon fontSize="small" />
              </IconButton>
            ))}
          </Box>

          {!hideColor && (
            <>
              <Divider sx={{ my: 1 }} />

              <Typography
                variant="caption"
                color={colorError ? "error" : "text.secondary"}
                sx={{ mb: 0.5, display: "block" }}
              >
                Color de fondo{colorError ? ` — ${colorError.message}` : ""}
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 1fr)",
                  gap: 0.5,
                  p: 0.5,
                  borderRadius: 1,
                  border: colorError ? "1px solid" : "none",
                  borderColor: "error.main",
                }}
              >
                {CATEGORY_COLORS.map((c) => (
                  <IconButton
                    size="small"
                    key={c}
                    disableRipple
                    onClick={() => onChangeColor?.(c)}
                    sx={{
                      backgroundColor: c,
                      width: 32,
                      height: 32,
                      border: c === color ? "2px solid" : "1px solid",
                      borderColor: c === color ? "primary.main" : "grey.300",
                      borderRadius: "50%",
                      "&:hover": {
                        backgroundColor: c,
                        opacity: 0.8,
                      },
                    }}
                  >
                    {c === color && (
                      <CheckOutlined
                        sx={{ fontSize: 14, color: "primary.main" }}
                      />
                    )}
                  </IconButton>
                ))}
              </Box>
            </>
          )}
        </Box>
      </Popover>
    </>
  );
};
