import { FC } from "react";
import { Folder, InfoOutline } from "@mui/icons-material";
import {
  Box,
  Avatar,
  Typography,
  IconButton,
  FormControlLabel,
  Checkbox,
  TextField,
  alpha,
} from "@mui/material";
import { NumericInput } from "../../../../components";

interface Props {
  name: string;
  description: string | null;
  totalEmission: number;
  setTotalEmission: (value: number) => void;
  isTotalManualEmissionsMode: boolean;
  setIsTotalManualEmissionsMode: (value: boolean) => void;
}

export const SubcategoryHeader: FC<Props> = ({
  name,
  description,
  totalEmission,
  setTotalEmission,
  isTotalManualEmissionsMode,
  setIsTotalManualEmissionsMode,
}) => {
  const onChangeTotalEmission = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTotalEmission(Number(e.target.value));
  };

  return (
    <Box className="flex h-20 gap-4">
      <Box className="flex flex-1 flex-row items-center gap-2">
        <Avatar
          sx={(theme) => ({
            backgroundColor: alpha(theme.palette.grey[300], 0.3),
            width: 48,
            height: 48,
          })}
        >
          <Folder sx={{ color: "text.primary" }} />
        </Avatar>
        <Box className="flex flex-col">
          <Box className="flex flex-row items-center">
            <Typography variant="subtitle1" fontWeight="medium">
              {name}
            </Typography>
            <IconButton aria-label="source-info" size="small">
              <InfoOutline fontSize="inherit" />
            </IconButton>
          </Box>

          <Typography variant="caption" fontWeight="regular">
            {description}
          </Typography>
        </Box>
        <Box className="flex flex-col"></Box>
      </Box>

      <Box className="flex flex-row content-center items-center gap-2">
        {isTotalManualEmissionsMode ? (
          <NumericInput
            label="Emisiones"
            value={totalEmission}
            onChange={onChangeTotalEmission}
            sx={{
              minHeight: 40,
              height: 40,
            }}
          />
        ) : (
          <Typography variant="subtitle1" fontWeight="bold">
            {totalEmission}
          </Typography>
        )}
        <Typography variant="subtitle1" fontWeight="bold">
          (tCO₂e)
        </Typography>
      </Box>

      <Box className="align-end flex flex-row-reverse">
        <FormControlLabel
          control={
            <Checkbox
              sx={{
                padding: 1,
              }}
              checked={isTotalManualEmissionsMode}
              onChange={(e) => setIsTotalManualEmissionsMode(e.target.checked)}
            />
          }
          label={
            <Typography variant="body2" fontWeight="regular">
              Sólo quiero ingresar el total de emisiones
            </Typography>
          }
        />
      </Box>
    </Box>
  );
};
