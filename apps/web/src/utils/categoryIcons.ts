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
import { DirectEmissionCategoryIcon } from "../icons/DirectEmissionCategoryIcon";
import { IndirectEmissionCategoryIcon } from "../icons/IndirectEmissionCategoryIcon";
import { OthersCategoryIcon } from "../icons/OthersCategoryIcon";

/** Valid category icon names */
export type CategoryIconName =
  | "FACTORY"
  | "BOLT"
  | "TRUCK"
  | "FLAME"
  | "CAR"
  | "SNOWFLAKE"
  | "WATER"
  | "RECYCLE"
  | "AGRICULTURE"
  | "BUILDING"
  | "FLIGHT"
  | "TRAIN"
  | "ELECTRIC"
  | "SOLAR"
  | "FOREST"
  | "WASTE"
  | "CONSTRUCTION"
  | "SCIENCE"
  | "FUEL"
  | "GLOBE"
  | "DIRECT_EMISSION"
  | "INDIRECT_EMISSION"
  | "OTHERS";

/** Map of icon name identifiers to MUI icon components */
export const CATEGORY_ICON_MAP: Record<
  CategoryIconName,
  ComponentType<SvgIconProps>
> = {
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
  DIRECT_EMISSION: DirectEmissionCategoryIcon,
  INDIRECT_EMISSION: IndirectEmissionCategoryIcon,
  OTHERS: OthersCategoryIcon,
};
