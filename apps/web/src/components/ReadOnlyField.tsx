import { FC } from "react";
import { Box, Typography, TextField, useTheme } from "@mui/material";

interface Props {
  label: string;
  value?: string;
}

export const ReadOnlyField: FC<Props> = ({ label, value = "" }) => {
  const theme = useTheme();

  return (
    <Box>
      <Typography variant="body2" fontWeight={500} className="mb-1">
        {label}
      </Typography>
      <TextField
        sx={{
          padding: "4px 12px",
          borderRadius: "8px",
          backgroundColor: theme.palette.grey[200],
        }}
        variant="standard"
        disabled
        value={value}
        fullWidth
        size="small"
        slotProps={{
          input: {
            disableUnderline: true,
            sx: {
              fontSize: 14,
            },
          },
        }}
      />
    </Box>
  );
};
