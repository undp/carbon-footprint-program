import { FC } from "react";
import { LegalFootnote } from "@/components/layout";
import { ABOUT_DISCLAIMER } from "../constants";

/** Closing note about funding and responsibility for the content. */
export const AboutDisclaimer: FC = () => (
  <LegalFootnote text={ABOUT_DISCLAIMER} />
);
