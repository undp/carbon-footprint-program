import { ReactNode, useMemo } from "react";
import { useMethodologies } from "@/api/query/maintainer";
import { useMaintainerStore } from "./useMaintainerStore";
import {
  GetAllMethodologiesResponse,
  MethodologyVersionStatus,
} from "@repo/types";
import type { MaintainerState } from "../types";
import { MethodologySelector } from "../components/MethodologySelector";

export type ScopedMethodologyContext = {
  isViewOnly: boolean;
  selectorDisabled: boolean;
  methodologies: GetAllMethodologiesResponse;
  effectiveMethodologyId?: string;
  methodologyVersionId?: string;
  targetMethodology: GetAllMethodologiesResponse[number] | null;
  methodologySelector: ReactNode;
  selectMethodology: MaintainerState["selectMethodology"];
  stopEditing: MaintainerState["stopEditing"];
  isMethodologiesError: boolean;
  isLoadingMethodologies: boolean;
};

export const useMaintainerMethodologyScope = (): ScopedMethodologyContext => {
  const editingMethodology = useMaintainerStore((s) => s.editingMethodology);
  const selectedMethodology = useMaintainerStore((s) => s.selectedMethodology);
  const selectMethodology = useMaintainerStore((s) => s.selectMethodology);
  const stopEditing = useMaintainerStore((s) => s.stopEditing);
  const {
    data: methodologies = [],
    isError: isMethodologiesError,
    isLoading: isLoadingMethodologies,
  } = useMethodologies();

  const activeMethodology = useMemo(
    () =>
      methodologies.find(
        (m) => m.status === MethodologyVersionStatus.PUBLISHED
      ),
    [methodologies]
  );

  const effectiveMethodologyId =
    editingMethodology?.id ?? selectedMethodology?.id ?? activeMethodology?.id;

  const targetMethodology =
    methodologies.find((m) => m.id === effectiveMethodologyId) ?? null;
  const methodologyVersionId = targetMethodology?.id;

  const methodologySelector = (
    <MethodologySelector
      methodologies={methodologies}
      value={effectiveMethodologyId}
      disabled={!!editingMethodology}
      onChange={(id) => {
        const methodology = methodologies.find((m) => m.id === id);
        if (methodology) {
          selectMethodology({
            id: methodology.id,
            name: methodology.name,
            regulation: methodology.regulation,
          });
        }
      }}
    />
  );

  return {
    isViewOnly:
      !editingMethodology ||
      targetMethodology?.status === MethodologyVersionStatus.PUBLISHED,
    selectorDisabled: !!editingMethodology,
    methodologies,
    effectiveMethodologyId,
    methodologyVersionId,
    targetMethodology,
    methodologySelector,
    selectMethodology,
    stopEditing,
    isMethodologiesError,
    isLoadingMethodologies,
  };
};
