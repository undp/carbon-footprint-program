import { FC } from "react";
import { PublicPageHero, PublicPageLayout } from "@/components/layout";
import { ABOUT_STATS_OVERLAP } from "./constants";
import { AboutDisclaimer } from "./components/AboutDisclaimer";
import { AboutHero } from "./components/AboutHero";
import { AboutStatsBand } from "./components/AboutStatsBand";
import { AllianceSection } from "./components/AllianceSection";
import { ChallengeSection } from "./components/ChallengeSection";
import { FundingHighlightCard } from "./components/FundingHighlightCard";
import { OrganizationsSection } from "./components/OrganizationsSection";
import { PlatformSection } from "./components/PlatformSection";
import { RoadmapSection } from "./components/RoadmapSection";

export const AboutScreen: FC = () => (
  <PublicPageLayout
    hero={
      <PublicPageHero overlappingContentOffset={ABOUT_STATS_OVERLAP}>
        <AboutHero />
      </PublicPageHero>
    }
  >
    <AboutStatsBand />
    <ChallengeSection />
    <PlatformSection />
    <AllianceSection />
    <RoadmapSection />
    <FundingHighlightCard />
    <OrganizationsSection />
    <AboutDisclaimer />
  </PublicPageLayout>
);
