-- CreateIndex: partial unique index — at most one ACTIVE membership per user per org
CREATE UNIQUE INDEX "user_organization_membership_user_id_organization_id_active_key" ON "user_organization_membership"("user_id", "organization_id") WHERE status = 'ACTIVE';
