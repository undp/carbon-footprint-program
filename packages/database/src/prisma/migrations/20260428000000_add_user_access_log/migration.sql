-- CreateTable
CREATE TABLE "user_access_log" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_access_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_access_log_user_id_created_at_idx" ON "user_access_log"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "user_access_log_created_at_idx" ON "user_access_log"("created_at");

-- AddForeignKey
ALTER TABLE "user_access_log" ADD CONSTRAINT "user_access_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
