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
import type { IconName } from "@repo/types";
import { DirectEmissionCategoryIcon } from "../icons/DirectEmissionCategoryIcon";
import { IndirectEmissionCategoryIcon } from "../icons/IndirectEmissionCategoryIcon";
import { OthersCategoryIcon } from "../icons/OthersCategoryIcon";

/** Map of icon name identifiers to MUI icon components */
export const CATEGORY_ICON_MAP: Record<
  IconName,
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
