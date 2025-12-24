import { CarbonInventory, UpdateCarbonInventoryRequest } from "@repo/types";
import { BusinessProfilingFormValues } from "../hooks/useBusinessProfilingForm";

export const mapInventoryToFormValues = (
  inventory: CarbonInventory
): BusinessProfilingFormValues => {
  const organizationData = inventory.organizationData;
  const toSafeString = (value: unknown) => {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }

    return "";
  };

  return {
    year: toSafeString(inventory.year),
    usageMode: inventory.usageMode,
    companyName: toSafeString(organizationData?.name),
    sector: toSafeString(organizationData?.sectorId),
    subSector: toSafeString(organizationData?.subsectorId),
    companySize: toSafeString(organizationData?.sizeId),
    activity: toSafeString(organizationData?.mainActivityId),
    quantity: toSafeString(organizationData?.mainActivityQuantity),
  };
};

export const mapFormValuesToRequest = (
  values: BusinessProfilingFormValues
): UpdateCarbonInventoryRequest => {
  return {
    year: values.year !== "" ? Number(values.year) : undefined,
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
