-- Index on submission.badge_id for FK lookup performance
CREATE INDEX "submission_badge_id_idx" ON "submission"("badge_id");
