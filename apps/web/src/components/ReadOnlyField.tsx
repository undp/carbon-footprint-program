import { FC } from "react";
import { Box, Skeleton, Typography, TextField, useTheme } from "@mui/material";

interface Props {
  label: string;
  value?: string | null;
  isLoading?: boolean;
}

export const ReadOnlyField: FC<Props> = ({ label, value = "", isLoading }) => {
  const theme = useTheme();

  return (
    <Box>
      <Typography variant="body2" fontWeight={500} className="mb-1">
        {label}
      </Typography>
      {isLoading ? (
        <Skeleton variant="rounded" height={32} />
      ) : (
        <TextField
          sx={{
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
                padding: "4px 12px",
                fontSize: 14,
              },
            },
          }}
        />
      )}
    </Box>
  );
};
