-- CreateTable
CREATE TABLE "user_role_audit" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "previous_role" "SystemRole" NOT NULL,
    "new_role" "SystemRole" NOT NULL,
    "changed_by_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_role_audit_user_id_created_at_idx" ON "user_role_audit"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "user_role_audit" ADD CONSTRAINT "user_role_audit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_audit" ADD CONSTRAINT "user_role_audit_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
