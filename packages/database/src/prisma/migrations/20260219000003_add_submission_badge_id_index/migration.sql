-- Index on submission.badge_id for FK lookup performance
CREATE INDEX "idx_submission_badge_id" ON "submission"("badge_id");
