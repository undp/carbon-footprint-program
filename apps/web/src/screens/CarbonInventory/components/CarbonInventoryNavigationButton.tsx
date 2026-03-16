import { FC } from "react";
import { Button, ButtonProps } from "@mui/material";
import { ArrowForwardRounded, HomeOutlined } from "@mui/icons-material";

interface Props {
  type: "inventories" | "landing";
  buttonProps: ButtonProps;
}

export const CarbonInventoryNavigationButton: FC<Props> = ({
  type,
  buttonProps,
}) => {
  return type === "inventories" ? (
    <Button
      variant="outlined"
      startIcon={<ArrowForwardRounded />}
      {...buttonProps}
    >
      Ir a mis huellas
    </Button>
  ) : (
    <Button variant="outlined" startIcon={<HomeOutlined />} {...buttonProps}>
      Ir al inicio
    </Button>
  );
};
