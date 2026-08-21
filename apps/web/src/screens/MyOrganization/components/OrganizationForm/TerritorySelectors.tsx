import { FC } from "react";
import { Box } from "@mui/material";
import { Control } from "react-hook-form";
import { FormAutocompleteField } from "@/components";
import { OrganizationFormValues } from "../../types";
import { TerritoryLevelState } from "./hooks";

interface Props {
  control: Control<OrganizationFormValues>;
  levels: TerritoryLevelState[];
}

/**
 * The territorial location, one selector per level of the official hierarchy,
 * each scoped to the answer above it. Levels are optional: a registrant answers
 * as far down as they know, and the innermost answer is what gets stored.
 */
export const TerritorySelectors: FC<Props> = ({ control, levels }) => {
  const visibleLevels = levels.filter((level) => level.visible);

  return (
    <Box className="flex flex-wrap gap-6">
      {visibleLevels.map(({ level, label, options, loading }) => (
        <Box key={level} className="min-w-[16rem] flex-1">
          <FormAutocompleteField
            name={`territoryIds.${level}`}
            control={control}
            label={label}
            labelId={`territory-level-${level}-label`}
            options={options}
            loading={loading}
            disabled={loading || options.length === 0}
          />
        </Box>
      ))}
    </Box>
  );
};
