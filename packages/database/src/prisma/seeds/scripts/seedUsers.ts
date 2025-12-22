import { type PrismaClient, type Prisma } from "../../../index.js";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import {
  checkForDuplicates,
  generateSeedDataPath,
  type SeedsDataset,
} from "../utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type UserData = (Required<
  Pick<Prisma.userCreateInput, "email" | "first_name" | "last_name">
> & {
  country_job_position_name: Prisma.country_job_positionCreateInput["name"];
  country_iso_code: Prisma.countryCreateInput["iso_code"];
})[];

const UserDataSchema: z.ZodType<UserData> = z.array(
  z.object({
    email: z.email(),
    country_job_position_name: z.string().min(1),
    country_iso_code: z.string().min(1),
    first_name: z.string(),
    last_name: z.string(),
  })
);

export async function seedUsers(prisma: PrismaClient, dataset: SeedsDataset) {
  console.log("Seeding users...");

  // Get all countries and job positions from database
  const countries = await prisma.country.findMany();
  const countryByIso = new Map(countries.map((c) => [c.iso_code, c]));

  const jobPositions = await prisma.country_job_position.findMany({
    include: { country: true },
  });
  const jobPositionMap = new Map(
    jobPositions.map((jp) => [`${jp.country.iso_code}:${jp.name}`, jp])
  );

  // Read users data
  const usersData = UserDataSchema.parse(
    JSON.parse(
      readFileSync(
        generateSeedDataPath(__dirname, "users.json", dataset),
        "utf-8"
      )
    )
  );

  // Check the data has no duplicates based on email
  checkForDuplicates(usersData, ["email"]);

  // Prepare users data with country_job_position_id
  const usersToCreate = usersData.map((user) => {
    const country = countryByIso.get(user.country_iso_code);
    if (!country)
      throw new Error(
        `Country '${user.country_iso_code}' not found in dataset ${dataset}`
      );

    const jobPosition = jobPositionMap.get(
      `${user.country_iso_code}:${user.country_job_position_name}`
    );
    if (!jobPosition)
      throw new Error(
        `Job position '${user.country_job_position_name}' for country '${user.country_iso_code}' not found in dataset ${dataset}`
      );

    return {
      email: user.email,
      country_job_position_id: jobPosition.id,
      first_name: user.first_name,
      last_name: user.last_name,
    };
  });

  // Batch create users (skips duplicates)
  await prisma.user.createMany({
    data: usersToCreate,
    skipDuplicates: true,
  });

  // Verify all users were created
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: usersData.map((u) => u.email),
      },
    },
  });

  if (users.length !== usersData.length)
    throw new Error(
      `Expected ${usersData.length} users but found ${users.length} for dataset ${dataset}`
    );

  console.log(
    `✓ Ensured ${usersData.length} users exist for dataset ${dataset}`
  );
}
