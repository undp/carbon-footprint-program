-- CreateTable
CREATE TABLE "reduction_projects" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT,
    "organization_id" BIGINT,
    "carbon_inventory_id" BIGINT,
    "implementation_date" TIMESTAMP(3),
    "description" TEXT,
    "subcategory_id" BIGINT,
    "gwp_used" TEXT,
    "use_national_gwp" BOOLEAN NOT NULL DEFAULT false,
    "considered_gei" TEXT[],
    "reported_elsewhere" BOOLEAN NOT NULL DEFAULT false,
    "reported_elsewhere_description" TEXT,
    "year" INTEGER,
    "baseline_scenario" DECIMAL(15,4),
    "project_scenario" DECIMAL(15,4),
    "status" "inventory_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by_id" BIGINT,
    "updated_by_id" BIGINT,

    CONSTRAINT "reduction_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_subject_reduction_projects" (
    "subject_id" BIGINT NOT NULL,
    "reduction_project_id" BIGINT NOT NULL,

    CONSTRAINT "submission_subject_reduction_projects_pkey" PRIMARY KEY ("subject_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "submission_subject_reduction_projects_reduction_project_id_key" ON "submission_subject_reduction_projects"("reduction_project_id");

-- AddForeignKey
ALTER TABLE "reduction_projects" ADD CONSTRAINT "reduction_projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_projects" ADD CONSTRAINT "reduction_projects_carbon_inventory_id_fkey" FOREIGN KEY ("carbon_inventory_id") REFERENCES "carbon_inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_projects" ADD CONSTRAINT "reduction_projects_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_projects" ADD CONSTRAINT "reduction_projects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reduction_projects" ADD CONSTRAINT "reduction_projects_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_subject_reduction_projects" ADD CONSTRAINT "submission_subject_reduction_projects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "submission_subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_subject_reduction_projects" ADD CONSTRAINT "submission_subject_reduction_projects_reduction_project_id_fkey" FOREIGN KEY ("reduction_project_id") REFERENCES "reduction_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
