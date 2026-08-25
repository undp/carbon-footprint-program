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

/** Every other row of this form is two fields wide, and so is this one. */
const COLUMNS = 2;

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

  const rows = Array.from(
    { length: Math.ceil(visibleLevels.length / COLUMNS) },
    (_, row) => visibleLevels.slice(row * COLUMNS, row * COLUMNS + COLUMNS)
  );

  return (
    <>
      {rows.map((row, rowIndex) => (
        <Box key={row[0]?.level ?? rowIndex} className="flex gap-6">
          {row.map(({ level, label, options, loading, disabled }) => (
            <Box key={level} className="flex-1">
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
          {/* Keeps a lone selector at half width instead of spanning the row. */}
          {row.length < COLUMNS && <Box className="flex-1" />}
        </Box>
      ))}
    </>
  );
};
