import { SxProps, Theme } from "@mui/material";
import { StylizedDataGrid, type StylizedDataGridProps } from "@components";

interface MaintainerDataGridProps extends StylizedDataGridProps {
  editingRowId: string | null;
  cellMaxHeight?: number;
}

type SxArrayItem = Extract<SxProps<Theme>, readonly unknown[]>[number];

const isSxArray = (
  value: SxProps<Theme> | undefined
): value is Extract<SxProps<Theme>, readonly unknown[]> => Array.isArray(value);

export const MaintainerDataGrid = ({
  editingRowId,
  cellMaxHeight = 100,
  sx,
  getRowClassName,
  ...props
}: MaintainerDataGridProps) => {
  const sxArray: SxArrayItem[] = isSxArray(sx)
    ? [...sx]
    : sx
      ? [sx as SxArrayItem]
      : [];

  return (
    <StylizedDataGrid
      sx={[
        (theme: Theme) => ({
          "& .MuiDataGrid-columnHeader": {
            backgroundColor: theme.palette.grey[200],
          },
          "& .MuiDataGrid-cell": {
            display: "flex",
            maxHeight: cellMaxHeight,
            alignItems: "center",
          },
          "& .MuiDataGrid-cell .MuiOutlinedInput-root": {
            backgroundColor: theme.palette.common.white,
          },
          "& .MuiDataGrid-cell .MuiSelect-select": {
            backgroundColor: theme.palette.common.white,
          },
          "& .MuiDataGrid-row.row--editing": {
            backgroundColor: theme.palette.grey[100],
          },
        }),
        ...sxArray,
      ]}
      getRowClassName={
        getRowClassName ??
        (({ id }) => (String(id) === editingRowId ? "row--editing" : ""))
      }
      {...props}
    />
  );
};
