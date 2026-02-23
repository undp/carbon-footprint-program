-- CreateEnum
CREATE TYPE "membership_status" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "organization_role" AS ENUM ('VIEWER', 'ORGANIZATION_CONTRIBUTOR', 'ORGANIZATION_ADMIN', 'EXTERNAL_VERIFIER', 'EXTERNAL_CONSULTANT');

-- CreateTable
CREATE TABLE "user_organization_membership" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "role" "organization_role" NOT NULL DEFAULT 'VIEWER',
    "status" "membership_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "user_organization_membership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_organization_membership_user_id_organization_id_role_key" ON "user_organization_membership"("user_id", "organization_id", "role");

-- AddForeignKey
ALTER TABLE "user_organization_membership" ADD CONSTRAINT "user_organization_membership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_organization_membership" ADD CONSTRAINT "user_organization_membership_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_organization_membership" ADD CONSTRAINT "user_organization_membership_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_organization_membership" ADD CONSTRAINT "user_organization_membership_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
