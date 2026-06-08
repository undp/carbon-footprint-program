import { FC, ReactNode } from "react";
import { useFormContext, useFormState } from "react-hook-form";
import { ListSubheader, MenuItem, TextField } from "@mui/material";
import { getNestedError } from "./cellUtils";

export interface SubcategoryGroupedOption {
  id: string;
  name: string;
  categoryName: string;
}

interface Props {
  formArrayName: string;
  rowIndex: number;
  fieldName: string;
  value: string;
  onChange: (value: string) => void;
  subcategories: SubcategoryGroupedOption[];
}

export const SubcategoryGroupedSelectCell: FC<Props> = ({
  formArrayName,
  rowIndex,
  fieldName,
  value,
  onChange,
  subcategories,
}) => {
  const { control } = useFormContext();
  const { errors } = useFormState({
    control,
    name: `${formArrayName}.${rowIndex}.${fieldName}`,
  });
  const fieldError = getNestedError(errors, formArrayName, rowIndex, fieldName);

  const items: ReactNode[] = [];
  let lastCategory = "";
  for (const sc of subcategories) {
    if (sc.categoryName !== lastCategory) {
      lastCategory = sc.categoryName;
      items.push(
        <ListSubheader key={`header-${sc.categoryName}`}>
          {sc.categoryName}
        </ListSubheader>
      );
    }
    items.push(
      <MenuItem key={sc.id} value={sc.id}>
        {sc.name}
      </MenuItem>
    );
  }

  return (
    <TextField
      select
      fullWidth
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={!!fieldError}
      label={fieldError?.message ?? ""}
      sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "white" } }}
    >
      {items}
    </TextField>
  );
};
