import { FC } from "react";
import { useWatch, useFormState, useFormContext } from "react-hook-form";
import { Select, MenuItem, Typography, Tooltip } from "@mui/material";
import { getNestedError } from "./cellUtils";
import { useOverflowTooltip } from "@/hooks";

interface CategorySelectCellProps {
  formArrayName: string;
  rowIndex: number;
  isEditing: boolean;
  categories: Array<{ id: string; name: string }>;
  onChange: (categoryId: string) => void;
  onClick?: () => void;
}

export const CategorySelectCell: FC<CategorySelectCellProps> = ({
  formArrayName,
  rowIndex,
  isEditing,
  categories,
  onChange,
  onClick,
}) => {
  const formPath = `${formArrayName}.${rowIndex}.categoryId`;
  const { control } = useFormContext();
  const categoryId = useWatch({ name: formPath }) as string;
  const { errors } = useFormState({ control, name: formPath });
  const fieldError = getNestedError(
    errors,
    formArrayName,
    rowIndex,
    "categoryId"
  );

  const categoryName = categories.find((c) => c.id === categoryId)?.name ?? "—";

  const { isOverflowed, overflowRef } = useOverflowTooltip<HTMLElement>([
    categoryName,
  ]);

  if (!isEditing) {
    return (
      <Tooltip
        title={isOverflowed ? categoryName : ""}
        arrow
        placement="top"
        enterDelay={500}
      >
        <Typography
          ref={overflowRef}
          onClick={onClick}
          sx={{
            px: 1,
            py: 0.5,
            borderRadius: 1,
            cursor: onClick ? "pointer" : "default",
            transition: "background-color 0.15s ease",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            width: "100%",
            "&:hover": onClick ? { backgroundColor: "grey.100" } : {},
          }}
        >
          {categoryName}
        </Typography>
      </Tooltip>
    );
  }

  return (
    <Select
      fullWidth
      size="small"
      value={categoryId}
      onChange={(e) => onChange(e.target.value)}
      error={!!fieldError}
      onKeyDown={(e) => e.stopPropagation()}
      sx={{
        "& .MuiOutlinedInput-notchedOutline": {
          backgroundColor: "transparent",
        },
        backgroundColor: "white",
      }}
    >
      {categories.map((c) => (
        <MenuItem key={c.id} value={c.id}>
          {c.name}
        </MenuItem>
      ))}
    </Select>
  );
};
