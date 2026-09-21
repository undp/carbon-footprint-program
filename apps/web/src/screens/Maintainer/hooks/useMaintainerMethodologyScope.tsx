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
  /**
   * Whether the emission-factor screen may write, which the published version
   * no longer forbids: what can change inside it is decided per factor, by
   * whether an active line depends on it, and the API enforces that.
   *
   * Deliberately separate from `isViewOnly`, which keeps its `PUBLISHED` term
   * so Categories, Subcategories and Dimensions stay read-only over the live
   * version. No dependency rule stands behind those three, and deleting a
   * subcategory cascades to its emission factors whether or not they are used.
   */
  canEditEmissionFactors: boolean;
  /**
   * Whether the maintainer entered a methodology to edit it, whatever any one
   * screen may write. The exit affordance hangs off this rather than off write
   * permission: a published version puts three of the four screens in edit mode
   * with nothing writable, and they still have to offer a way out.
   */
  isEditingMethodology: boolean;
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
    canEditEmissionFactors: !!editingMethodology,
    isEditingMethodology: !!editingMethodology,
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
