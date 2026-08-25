import { FC, ReactNode } from "react";
import { Box } from "@mui/material";
import { Control } from "react-hook-form";
import { FormAutocompleteField, FormTextField } from "@/components";
import { OrganizationFormValues } from "../../types";
import { TerritorySelectorState } from "./hooks";

interface Props {
  control: Control<OrganizationFormValues>;
  levels: TerritorySelectorState[];
}

/** Every other row of this form is two fields wide, and so are these. */
const COLUMNS = 2;

/**
 * The location section: one selector per level of the hierarchy the catalog
 * holds, each scoped to the answer above it, plus the free-text address.
 *
 * Levels are optional — a registrant answers as far down as they know, and the
 * innermost answer is what gets stored — and a level stays on screen while it is
 * locked rather than appearing once its parent is answered, so the shape of the
 * question does not change as it is being filled in.
 *
 * The address is laid out as the last cell of the same grid rather than on a row
 * of its own, so it fills the gap an odd number of selectors leaves instead of
 * sitting beside a hole. That also means it moves on its own the day a level
 * lands.
 */
export const LocationFields: FC<Props> = ({ control, levels }) => {
  const cells: { key: string; field: ReactNode }[] = [
    ...levels
      .filter((level) => level.visible)
      .map(({ level, label, options, loading, disabled }) => ({
        key: `territory-${level}`,
        field: (
          <FormAutocompleteField
            name={`territoryIds.${level}`}
            control={control}
            label={label}
            labelId={`territory-level-${level}-label`}
            options={options}
            loading={loading}
            disabled={disabled || loading}
          />
        ),
      })),
    {
      key: "address",
      field: (
        <FormTextField
          name="address"
          control={control}
          label="Dirección física"
        />
      ),
    },
  ];

  const rows = Array.from(
    { length: Math.ceil(cells.length / COLUMNS) },
    (_, row) => cells.slice(row * COLUMNS, row * COLUMNS + COLUMNS)
  );

  return (
    <>
      {rows.map((row, rowIndex) => (
        <Box key={row[0]?.key ?? rowIndex} className="flex gap-6">
          {row.map(({ key, field }) => (
            <Box key={key} className="flex-1">
              {field}
            </Box>
          ))}
          {/* Keeps a lone field at half width instead of spanning the row. */}
          {row.length < COLUMNS && <Box className="flex-1" />}
        </Box>
      ))}
    </>
  );
};
