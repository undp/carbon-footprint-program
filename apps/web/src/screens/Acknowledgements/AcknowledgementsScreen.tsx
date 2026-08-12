import { FC } from "react";
import { PublicPageHero, PublicPageLayout } from "@/components/layout";
import { RESEARCH_STATS_OVERLAP } from "./constants";
import { PARTICIPANT_GROUPS } from "./participants";
import { AcknowledgementsFootnote } from "./components/AcknowledgementsFootnote";
import { AcknowledgementsHero } from "./components/AcknowledgementsHero";
import { ParticipantGroupSection } from "./components/ParticipantGroupSection";
import { ResearchStatsBand } from "./components/ResearchStatsBand";

export const AcknowledgementsScreen: FC = () => (
  <PublicPageLayout
    hero={
      <PublicPageHero overlappingContentOffset={RESEARCH_STATS_OVERLAP}>
        <AcknowledgementsHero />
      </PublicPageHero>
    }
    contentGap={6}
  >
    <ResearchStatsBand />
    {PARTICIPANT_GROUPS.map((group) => (
      <ParticipantGroupSection key={group.title} group={group} />
    ))}
    <AcknowledgementsFootnote />
  </PublicPageLayout>
);
