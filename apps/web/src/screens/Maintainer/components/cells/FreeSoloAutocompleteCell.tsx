import { FC, useState, useEffect } from "react";
import { Autocomplete, TextField, Typography, Tooltip } from "@mui/material";
import { useOverflowTooltip } from "@/hooks";

interface FreeSoloAutocompleteCellProps {
  value: string;
  options: string[];
  isEditing: boolean;
  onChange: (value: string) => void;
  onClick?: () => void;
  errorMessage?: string;
  /**
   * Persistent guidance shown while editing, when there is no error to report.
   * A grid cell has no room for helper text under the input, so it rides the
   * same tooltip the error message uses.
   */
  helperText?: string;
}

export const FreeSoloAutocompleteCell: FC<FreeSoloAutocompleteCellProps> = ({
  value,
  options,
  isEditing,
  onChange,
  onClick,
  errorMessage,
  helperText,
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing controlled prop to local edit buffer; refactor to derived state requires API change
    setLocalValue(value);
  }, [value]);

  const { isOverflowed, overflowRef } = useOverflowTooltip<HTMLElement>([
    value,
  ]);

  if (!isEditing) {
    return (
      <Tooltip
        title={isOverflowed ? value : ""}
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
            "&:hover": onClick
              ? {
                  backgroundColor: "grey.100",
                }
              : {},
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            width: "100%",
          }}
        >
          {value}
        </Typography>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={errorMessage ?? helperText ?? ""} arrow placement="top">
      <Autocomplete
        freeSolo
        fullWidth
        size="small"
        options={options}
        value={localValue}
        onChange={(_, newValue) => setLocalValue(newValue ?? "")}
        onInputChange={(_, newInputValue) => setLocalValue(newInputValue)}
        onBlur={() => onChange(localValue)}
        sx={{
          "& .MuiAutocomplete-inputRoot": {
            py: 0,
          },
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            error={!!errorMessage}
            onKeyDown={(e) => e.stopPropagation()}
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "white",
              },
              minHeight: 0,
            }}
          />
        )}
      />
    </Tooltip>
  );
};
