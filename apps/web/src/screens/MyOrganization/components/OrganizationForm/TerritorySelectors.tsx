import { FC } from "react";
import { Box } from "@mui/material";
import { Control } from "react-hook-form";
import { FormAutocompleteField } from "@/components";
import { OrganizationFormValues } from "../../types";
import { TerritorySelectorState } from "./hooks";

interface Props {
  control: Control<OrganizationFormValues>;
  levels: TerritorySelectorState[];
}

/**
 * The territorial location, one selector per level the catalog holds, each
 * scoped to the answer above it. Levels are optional: a registrant answers as
 * far down as they know, and the innermost answer is what gets stored.
 *
 * A level stays on screen while it is locked rather than appearing once its
 * parent is answered, so the shape of the question does not change as it is
 * being filled in.
 */
export const TerritorySelectors: FC<Props> = ({ control, levels }) => {
  const visibleLevels = levels.filter((level) => level.visible);

  return (
    <Box className="flex flex-wrap gap-6">
      {visibleLevels.map(({ level, label, options, loading, disabled }) => (
        <Box key={level} className="min-w-[16rem] flex-1">
          <FormAutocompleteField
            name={`territoryIds.${level}`}
            control={control}
            label={label}
            labelId={`territory-level-${level}-label`}
            options={options}
            loading={loading}
            disabled={disabled || loading}
          />
        </Box>
      ))}
    </Box>
  );
};
