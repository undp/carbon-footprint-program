import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  CreateOrganizationBody,
  GetOrganizationByIdResponse,
} from "@repo/types";
import { useResetOnChange } from "@/hooks";
import { mapOrganizationToFormValues } from "../../../transformers";

const defaultValues: CreateOrganizationBody = {
  legalName: "",
  tradeName: "",
  taxId: "",
  address: "",
  sectorId: "",
  subsectorId: "",
  countryOrganizationSizeId: "",
  mainActivityId: "",
  employeesCount: null,
  representativeFullName: "",
  representativeTaxId: "",
  representativePositionId: "",
  representativePhone: "",
  representativeEmail: "",
};

type Params = {
  organization?: GetOrganizationByIdResponse;
};

export const useOrganizationForm = ({ organization }: Params = {}) => {
  const form = useForm<CreateOrganizationBody>({
    defaultValues,
  });

  const { control, setValue, reset, clearErrors } = form;

  const selectedSectorId = useWatch({ control, name: "sectorId" });
  const selectedSubsectorId = useWatch({ control, name: "subsectorId" });

  const prevSectorIdRef = useRef<string | undefined>(undefined);
  const prevSubsectorIdRef = useRef<string | undefined>(undefined);
  const isSettingFormDataRef = useRef<boolean>(true);

  // Reset subsector and activity when sector changes
  useResetOnChange(
    isSettingFormDataRef,
    selectedSectorId,
    prevSectorIdRef,
    () => {
      setValue("subsectorId", "");
      setValue("mainActivityId", "");
      clearErrors("subsectorId");
      clearErrors("mainActivityId");
    }
  );

  // Reset activity when subsector changes
  useResetOnChange(
    isSettingFormDataRef,
    selectedSubsectorId,
    prevSubsectorIdRef,
    () => {
      setValue("mainActivityId", "");
      clearErrors("mainActivityId");
    }
  );

  useEffect(() => {
    if (organization) {
      isSettingFormDataRef.current = true;
      const mappedOrganization = mapOrganizationToFormValues(organization);
      reset(mappedOrganization);

      // Keeps refs aligned with initial values before enabling effects
      prevSectorIdRef.current = mappedOrganization.sectorId || undefined;
      prevSubsectorIdRef.current = mappedOrganization.subsectorId || undefined;

      // Releases effects after React Hook Form propagates the values
      queueMicrotask(() => {
        isSettingFormDataRef.current = false;
      });
    } else {
      prevSectorIdRef.current = undefined;
      prevSubsectorIdRef.current = undefined;
      isSettingFormDataRef.current = false;
    }
  }, [organization, reset]);

  return {
    ...form,
    selectedSectorId,
    selectedSubsectorId,
  };
};
