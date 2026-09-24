import { FC } from "react";
import { Alert, AlertTitle } from "@mui/material";

interface YearWithoutFactorsAlertProps {
  year: number;
}

/**
 * Step 1's notice for a year the catalogue does not cover. It heads the step,
 * above its title, so the cost of the choice is read before the form rather
 * than found partway down it — and well before the capture step shows every
 * «Fuente» selector empty.
 */
export const YearWithoutFactorsAlert: FC<YearWithoutFactorsAlertProps> = ({
  year,
}) => (
  <Alert severity="warning">
    <AlertTitle>
      Todavía no hay factores de emisión para el año {year}
    </AlertTitle>
    Las subcategorías llegarán sin factores precargados al paso de captura, así
    que el selector «Fuente» se verá vacío en todas las fuentes de emisión.
    Igualmente puedes ingresar tus consumos y elegir «Otro» como fuente para
    registrar un factor propio, documentando de dónde lo obtuviste, o elegir
    otro año.
  </Alert>
);
