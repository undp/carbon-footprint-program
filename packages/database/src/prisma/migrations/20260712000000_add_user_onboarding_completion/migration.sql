-- CreateTable
CREATE TABLE "user_onboarding_completion" (
    "user_id" BIGINT NOT NULL,
    "onboarding_key" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_onboarding_completion_pkey" PRIMARY KEY ("user_id","onboarding_key")
);

-- AddForeignKey
ALTER TABLE "user_onboarding_completion" ADD CONSTRAINT "user_onboarding_completion_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
