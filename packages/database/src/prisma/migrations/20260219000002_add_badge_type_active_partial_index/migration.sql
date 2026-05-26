-- Only one ACTIVE badge per type (partial unique index, managed manually)
CREATE UNIQUE INDEX "badge_type_active_key" ON "badge"("type") WHERE status = 'ACTIVE';
