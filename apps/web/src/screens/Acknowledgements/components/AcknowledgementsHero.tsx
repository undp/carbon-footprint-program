import { FC } from "react";
import { PublicPageHeroHeading } from "@/components/layout";
import { ACKNOWLEDGEMENTS_HERO } from "../constants";

/** Header for "Agradecimientos". */
export const AcknowledgementsHero: FC = () => (
  <PublicPageHeroHeading
    title={ACKNOWLEDGEMENTS_HERO.title}
    lead={ACKNOWLEDGEMENTS_HERO.lead}
  />
);
