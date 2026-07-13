-- Reduction projects can now be saved as partial DRAFTs: the fields that are
-- only required to postular become nullable, and considered_gei defaults to an
-- empty array so a draft can be created without providing any gases.
ALTER TABLE "reduction_projects" ALTER COLUMN "implementation_date" DROP NOT NULL;
ALTER TABLE "reduction_projects" ALTER COLUMN "description" DROP NOT NULL;
ALTER TABLE "reduction_projects" ALTER COLUMN "subcategory_id" DROP NOT NULL;
ALTER TABLE "reduction_projects" ALTER COLUMN "year" DROP NOT NULL;
ALTER TABLE "reduction_projects" ALTER COLUMN "baseline_scenario" DROP NOT NULL;
ALTER TABLE "reduction_projects" ALTER COLUMN "project_scenario" DROP NOT NULL;
ALTER TABLE "reduction_projects" ALTER COLUMN "considered_gei" SET DEFAULT ARRAY[]::TEXT[];
