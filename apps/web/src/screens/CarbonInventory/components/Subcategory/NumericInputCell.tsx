import { FC } from "react";
import { OutlinedInput, Typography } from "@mui/material";
import { GridRenderCellParams } from "@mui/x-data-grid";
import { CarbonInventoryLine } from "@repo/types";

interface Props
  extends GridRenderCellParams<CarbonInventoryLine, number | null> {
  suffix?: string;
  onUpdate: (rowId: string, field: string, value: string) => void;
}

export const NumericInputCell: FC<Props> = (params) => (
  <OutlinedInput
    type="number"
    size="small"
    fullWidth
    value={params.value ?? ""}
    placeholder="0"
    endAdornment={
      params.suffix && (
        <Typography variant="subtitle2">{params.suffix}</Typography>
      )
    }
    onChange={(e) => {
      const value = e.target.value;
      params.api.updateRows([
        {
          id: params.id,
          [params.field]: value,
        },
      ]);
      params.onUpdate(params.id.toString(), params.field, value);
    }}
    inputProps={{
      min: 0,
      inputMode: "numeric",
      pattern: "[0-9]*",
    }}
    sx={{
      "& input": {
        textAlign: "right",
        marginRight: params.suffix ? 1 : 0,
      },
      /* Chrome / Edge / Safari */
      "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
        {
          WebkitAppearance: "none",
          margin: 0,
        },
      /* Firefox */
      "& input[type=number]": {
        MozAppearance: "textfield",
      },
    }}
  />
);
