import { CarbonInventory, UpdateCarbonInventoryRequest } from "@repo/types";
import { BusinessProfilingFormValues } from "../hooks/useBusinessProfilingForm";

export const mapInventoryToFormValues = (
  inventory: CarbonInventory
): BusinessProfilingFormValues => {
  const organizationData = inventory.organizationData;

  return {
    year: String(inventory.year ?? ""),
    usageMode: inventory.usageMode ?? "EXPERT",
    companyName: String(organizationData?.name ?? ""),
    sector: String(organizationData?.sectorId ?? ""),
    subSector: String(organizationData?.subsectorId ?? ""),
    companySize: String(organizationData?.sizeId ?? ""),
    activity: String(organizationData?.mainActivityId ?? ""),
    quantity: String(organizationData?.mainActivityQuantity ?? ""),
  };
};

export const mapFormValuesToRequest = (
  values: BusinessProfilingFormValues
): UpdateCarbonInventoryRequest => {
  return {
    year: values.year ? Number(values.year) : undefined,
    usageMode: values.usageMode,
    organizationData: {
      name: values.companyName || null,
      sectorId: values.sector || null,
      subsectorId: values.subSector || null,
      sizeId: values.companySize || null,
      mainActivityId: values.activity || null,
      mainActivityQuantity: values.quantity ? Number(values.quantity) : null,
    },
  };
};
