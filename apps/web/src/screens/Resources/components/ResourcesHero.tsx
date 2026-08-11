import { FC } from "react";
import { PublicPageHeroHeading } from "@/components/layout";
import { RESOURCES_HERO } from "../constants";

/** Header for "Material complementario". */
export const ResourcesHero: FC = () => (
  <PublicPageHeroHeading
    title={RESOURCES_HERO.title}
    lead={RESOURCES_HERO.lead}
  />
);
