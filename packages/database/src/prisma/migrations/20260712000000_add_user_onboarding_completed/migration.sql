-- AlterTable
ALTER TABLE "user" ADD COLUMN "onboarding_completed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN "onboarding_completed_at" TIMESTAMP(3);

-- Backfill: users who already reached the end of the onboarding flow before
-- this feature existed must not be shown the guided welcome home again. Mark as
-- completed any user linked to a self-declared huella (the flow's final step) —
-- whether they created it, self-declared it, or belong to the owning
-- organization.
--
-- NOTE: this intentionally covers only the `isSelfDeclared` leg of
-- `isDashboardReady` (see apps/web welcomeHome.config.ts). The display statuses
-- CALCULATION_APPROVED / VERIFICATION_APPROVED are derived from submissions, not
-- a column here, so a huella that is recognition-approved *without* being
-- self-declared is not backfilled; those (rare) users see the 100% completed
-- state once and dismiss it via the "Terminar Onboarding" button.
UPDATE "user" u
SET "onboarding_completed" = true,
    "onboarding_completed_at" = CURRENT_TIMESTAMP
WHERE EXISTS (
  SELECT 1
  FROM "carbon_inventory" ci
  WHERE ci."is_self_declared" = true
    AND (
      ci."created_by_id" = u."id"
      OR ci."self_declared_by_id" = u."id"
      OR EXISTS (
        SELECT 1
        FROM "user_organization_membership" m
        WHERE m."user_id" = u."id"
          AND m."organization_id" = ci."organization_id"
          AND m."status" = 'ACTIVE'
      )
    )
);
