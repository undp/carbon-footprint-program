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
import { type IconName, IconNameValue } from "@repo/types";
import { DirectEmissionCategoryIcon } from "../icons/DirectEmissionCategoryIcon";
import { IndirectEmissionCategoryIcon } from "../icons/IndirectEmissionCategoryIcon";
import { OthersCategoryIcon } from "../icons/OthersCategoryIcon";

/** Map of icon name identifiers to MUI icon components */
export const CATEGORY_ICON_MAP: Record<
  IconName,
  ComponentType<SvgIconProps>
> = {
  [IconNameValue.FACTORY]: FactoryOutlined,
  [IconNameValue.BOLT]: BoltOutlined,
  [IconNameValue.TRUCK]: LocalShippingOutlined,
  [IconNameValue.FLAME]: WhatshotOutlined,
  [IconNameValue.CAR]: DirectionsCarOutlined,
  [IconNameValue.SNOWFLAKE]: AcUnitOutlined,
  [IconNameValue.WATER]: WaterDropOutlined,
  [IconNameValue.RECYCLE]: RecyclingOutlined,
  [IconNameValue.AGRICULTURE]: AgricultureOutlined,
  [IconNameValue.BUILDING]: BusinessOutlined,
  [IconNameValue.FLIGHT]: FlightOutlined,
  [IconNameValue.TRAIN]: TrainOutlined,
  [IconNameValue.ELECTRIC]: ElectricBoltOutlined,
  [IconNameValue.SOLAR]: SolarPowerOutlined,
  [IconNameValue.FOREST]: ForestOutlined,
  [IconNameValue.WASTE]: DeleteOutlineOutlined,
  [IconNameValue.CONSTRUCTION]: ConstructionOutlined,
  [IconNameValue.SCIENCE]: ScienceOutlined,
  [IconNameValue.FUEL]: LocalGasStationOutlined,
  [IconNameValue.GLOBE]: PublicOutlined,
  [IconNameValue.DIRECT_EMISSION]: DirectEmissionCategoryIcon,
  [IconNameValue.INDIRECT_EMISSION]: IndirectEmissionCategoryIcon,
  [IconNameValue.OTHERS]: OthersCategoryIcon,
};
