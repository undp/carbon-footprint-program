import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material";
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

/** Map of icon name identifiers to MUI icon components */
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

/** Resolves an icon name identifier to its MUI icon component, or null if not found */
export function getCategoryIconComponent(
  iconName: string | null | undefined
): ComponentType<SvgIconProps> | null {
  if (!iconName) return null;
  return CATEGORY_ICON_MAP[iconName] ?? null;
}
