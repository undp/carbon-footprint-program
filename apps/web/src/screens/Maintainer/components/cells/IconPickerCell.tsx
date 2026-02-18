import { FC, useState, type ComponentType } from "react";
import {
  Box,
  IconButton,
  Popover,
  Tooltip,
  Typography,
  Divider,
  type SvgIconProps,
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
  onChangeIcon: (iconName: string) => void;
  onChangeColor: (color: string) => void;
  onClick?: () => void;
}

export const IconPickerCell: FC<IconPickerCellProps> = ({
  iconName,
  color,
  isEditing,
  onChangeIcon,
  onChangeColor,
  onClick,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const IconComponent = CATEGORY_ICON_MAP[iconName] ?? FactoryOutlined;
  const isInteractive = isEditing || !!onClick;

  return (
    <>
      <Tooltip title={isEditing ? "Cambiar ícono y color" : iconName} arrow>
        <IconButton
          size="small"
          disableRipple
          disabled={!isInteractive}
          onClick={(e) => {
            if (isEditing) {
              setAnchorEl(e.currentTarget);
            } else if (onClick) {
              onClick();
              setAnchorEl(e.currentTarget);
            }
          }}
          sx={{
            backgroundColor: color || "#F5E6D3",
            width: 40,
            height: 40,
            cursor: isInteractive ? "pointer" : "default",
            "&:hover": {
              backgroundColor: color || "#F5E6D3",
              opacity: isInteractive ? 0.8 : 1,
            },
            "&.Mui-disabled": {
              backgroundColor: color || "#F5E6D3",
            },
          }}
        >
          <IconComponent
            fontSize="small"
            sx={{ color: "rgba(0, 0, 0, 0.7)" }}
          />
        </IconButton>
      </Tooltip>

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
            color="text.secondary"
            sx={{ mb: 0.5, display: "block" }}
          >
            Ícono
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 0.5,
              mb: 1,
            }}
          >
            {ICON_ENTRIES.map(([name, Icon]) => (
              <Tooltip key={name} title={name} arrow>
                <IconButton
                  size="small"
                  disableRipple
                  onClick={() => onChangeIcon(name)}
                  sx={{
                    borderRadius: 1,
                    backgroundColor:
                      name === iconName ? "primary.light" : "transparent",
                    "&:hover": { backgroundColor: "grey.200" },
                  }}
                >
                  <Icon fontSize="small" />
                </IconButton>
              </Tooltip>
            ))}
          </Box>

          <Divider sx={{ my: 1 }} />

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 0.5, display: "block" }}
          >
            Color de fondo
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 0.5,
            }}
          >
            {CATEGORY_COLORS.map((c) => (
              <Tooltip key={c} title={c} arrow>
                <IconButton
                  size="small"
                  disableRipple
                  onClick={() => onChangeColor(c)}
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
              </Tooltip>
            ))}
          </Box>
        </Box>
      </Popover>
    </>
  );
};
