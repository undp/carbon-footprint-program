import { FC } from "react";
import { PublicPageHero, PublicPageLayout } from "@/components/layout";
import { AboutBenefits } from "./components/AboutBenefits";
import { AboutFoundationNote } from "./components/AboutFoundationNote";
import { AboutHero } from "./components/AboutHero";
import { AboutIntro } from "./components/AboutIntro";
import { AboutSupporters } from "./components/AboutSupporters";

export const AboutScreen: FC = () => (
  <PublicPageLayout
    hero={
      <PublicPageHero>
        <AboutHero />
      </PublicPageHero>
    }
    contentGap={6}
  >
    <AboutIntro />
    <AboutBenefits />
    <AboutSupporters />
    <AboutFoundationNote />
  </PublicPageLayout>
);
