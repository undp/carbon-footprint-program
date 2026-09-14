import { FC } from "react";
import { LegalFootnote } from "@/components/layout";
import { ACKNOWLEDGEMENTS_FOOTNOTE } from "../constants";

/** Footnote about the origin of the list and how to request corrections. */
export const AcknowledgementsFootnote: FC = () => (
  <LegalFootnote text={ACKNOWLEDGEMENTS_FOOTNOTE} />
);
