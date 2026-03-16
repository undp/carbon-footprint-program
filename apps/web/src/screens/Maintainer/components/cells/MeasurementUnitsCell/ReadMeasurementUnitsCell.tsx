import { FC, useRef, useMemo, useLayoutEffect, useCallback } from "react";
import { Box, Chip, Typography, alpha } from "@mui/material";
import type { MeasurementUnit } from "../../../types";

interface ReadMeasurementUnitsCellProps {
  selectedUnits: MeasurementUnit[];
  unitIds: string[];
  onChange: (unitIds: string[]) => void;
  onClick?: () => void;
  onOpenAndEdit: () => void;
}

export const ReadMeasurementUnitsCell: FC<ReadMeasurementUnitsCellProps> = ({
  selectedUnits,
  unitIds,
  onChange,
  onClick,
  onOpenAndEdit,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const sortedUnits = useMemo(
    () => [...selectedUnits].sort((a, b) => a.name.length - b.name.length),
    [selectedUnits]
  );

  const recalculate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const dataChips = Array.from(
      container.querySelectorAll<HTMLElement>("[data-unit-chip]")
    );
    const overflowChip = container.querySelector<HTMLElement>(
      "[data-overflow-chip]"
    );
    const addChip = container.querySelector<HTMLElement>("[data-add-chip]");

    // Use flex-start during measurement so offsetTop is predictable
    container.style.alignContent = "flex-start";

    // Reset: show all data chips, hide overflow indicator
    for (const chip of dataChips) chip.style.display = "";
    if (overflowChip) overflowChip.style.display = "none";

    if (dataChips.length === 0) {
      container.style.alignContent = "center";
      return;
    }

    const containerHeight = container.clientHeight;

    // The tail element is the last thing in the flow
    const tailElement = addChip ?? dataChips[dataChips.length - 1];

    // All content fits — nothing to do
    if (tailElement.offsetTop + tailElement.offsetHeight <= containerHeight) {
      container.style.alignContent = "center";
      return;
    }

    // Not all fit — show overflow chip, then hide data chips from the end
    // until the full layout (visible chips + "+N" + "+ Agregar") fits.
    if (overflowChip) overflowChip.style.display = "";

    const tail = addChip ?? overflowChip ?? dataChips[dataChips.length - 1];
    let visibleCount = dataChips.length;

    while (
      visibleCount > 1 &&
      tail.offsetTop + tail.offsetHeight > containerHeight
    ) {
      visibleCount--;
      dataChips[visibleCount].style.display = "none";
    }

    const remaining = dataChips.length - visibleCount;
    if (overflowChip) {
      if (remaining > 0) {
        overflowChip.style.display = "";
        const label = overflowChip.querySelector(".MuiChip-label");
        if (label) label.textContent = `+${remaining}`;
      } else {
        overflowChip.style.display = "none";
      }
    }

    // Center vertically now that the final layout is determined
    container.style.alignContent = "center";
  }, []);

  useLayoutEffect(() => {
    recalculate();

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(recalculate);
    observer.observe(container);
    return () => observer.disconnect();
  }, [recalculate, sortedUnits]);

  return (
    <Box
      ref={containerRef}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 0.5,
        alignItems: "center",
        alignContent: "flex-start",
        width: "100%",
        height: "100%",
        px: 0.5,
        py: 0.5,
        borderRadius: 1,
        overflow: "hidden",
      }}
    >
      {sortedUnits.map((unit) => (
        <Chip
          key={unit.id}
          data-unit-chip=""
          label={unit.name}
          size="small"
          variant="outlined"
          color="primary"
          sx={{
            backgroundColor: (t) => alpha(t.palette.primary.main, 0.1),
          }}
          onDelete={
            onClick
              ? () => onChange(unitIds.filter((id) => id !== unit.id))
              : undefined
          }
        />
      ))}
      <Chip
        data-overflow-chip=""
        label=""
        size="small"
        variant="outlined"
        color="primary"
        onClick={onOpenAndEdit}
        sx={{
          backgroundColor: (t) => alpha(t.palette.primary.main, 0.1),
          cursor: onClick ? "pointer" : "default",
        }}
      />
      {sortedUnits.length === 0 && !onClick && (
        <Typography variant="body2" color="text.secondary">
          —
        </Typography>
      )}
      {onClick && (
        <Chip
          data-add-chip=""
          label="+ Agregar"
          size="small"
          variant="outlined"
          onClick={onOpenAndEdit}
          sx={{
            borderStyle: "dashed",
            borderColor: "primary.main",
            color: "primary.main",
          }}
        />
      )}
    </Box>
  );
};
