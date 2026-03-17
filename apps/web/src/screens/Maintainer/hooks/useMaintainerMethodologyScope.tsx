import { ReactNode, useMemo } from "react";
import { Box, MenuItem, Select, Typography } from "@mui/material";
import { useMethodologies } from "@/api/query/maintainer";
import { useMaintainerStore } from "./useMaintainerStore";
import {
  GetAllMethodologiesResponse,
  MethodologyVersionStatus,
} from "@repo/types";
import type { MaintainerState } from "../types";

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
};

export const useMaintainerMethodologyScope = (): ScopedMethodologyContext => {
  const editingMethodology = useMaintainerStore((s) => s.editingMethodology);
  const selectedMethodology = useMaintainerStore((s) => s.selectedMethodology);
  const selectMethodology = useMaintainerStore((s) => s.selectMethodology);
  const stopEditing = useMaintainerStore((s) => s.stopEditing);
  const { data: methodologies = [], isError: isMethodologiesError } =
    useMethodologies();

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
    <Box className="flex items-center gap-1">
      <Typography variant="body2" color="text.secondary" noWrap>
        Metodología:
      </Typography>
      <Select
        size="small"
        value={effectiveMethodologyId ?? ""}
        disabled={!!editingMethodology}
        onChange={(e) => {
          const methodology = methodologies.find(
            (m) => m.id === e.target.value
          );
          if (methodology) {
            selectMethodology({
              id: methodology.id,
              name: methodology.name,
              regulation: methodology.regulation,
            });
          }
        }}
        sx={{ minWidth: 220 }}
      >
        {methodologies.map((methodology) => (
          <MenuItem key={methodology.id} value={methodology.id}>
            {methodology.name}
          </MenuItem>
        ))}
      </Select>
    </Box>
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
  };
};
