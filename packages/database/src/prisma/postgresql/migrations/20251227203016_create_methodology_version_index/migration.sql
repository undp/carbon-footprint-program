-- CreateIndex
CREATE UNIQUE INDEX "methodology_version_country_id_name_version_active_unique" ON "methodology_version" ("country_id", "name", "version") WHERE "status" <> 'DELETED';
