import { type PrismaClient, type Prisma, SystemRole } from "../../../index.js";
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

type UserData = {
  idpUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  countryJobPositionName: Prisma.CountryJobPositionCreateInput["name"];
  countryIsoCode: Prisma.CountryCreateInput["isoCode"];
  role: SystemRole;
}[];

const UserDataSchema: z.ZodType<UserData> = z.array(
  z.object({
    idpUserId: z.string().min(1),
    email: z.email(),
    countryJobPositionName: z.string().min(1),
    countryIsoCode: z.string().min(1),
    role: z.enum(SystemRole),
    firstName: z.string(),
    lastName: z.string(),
  })
);

export async function seedUsers(prisma: PrismaClient, dataset: SeedsDataset) {
  console.log("Seeding users...");

  // Get all countries and job positions from database
  const countries = await prisma.country.findMany();
  const countryByIso = new Map(countries.map((c) => [c.isoCode, c]));

  const jobPositions = await prisma.countryJobPosition.findMany({
    include: { country: true },
  });
  const jobPositionMap = new Map(
    jobPositions.map((jp) => [`${jp.country.isoCode}:${jp.name}`, jp])
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

  // Upsert each user by idpUserId (unique). Re-running propagates email, name,
  // role, and job-position changes from JSON onto existing rows. Note: user
  // state managed through the app (memberships, audits) is not touched.
  for (const user of usersData) {
    const country = countryByIso.get(user.countryIsoCode);
    if (!country)
      throw new Error(
        `Country '${user.countryIsoCode}' not found in dataset ${dataset}`
      );

    const jobPosition = jobPositionMap.get(
      `${user.countryIsoCode}:${user.countryJobPositionName}`
    );
    if (!jobPosition)
      throw new Error(
        `Job position '${user.countryJobPositionName}' for country '${user.countryIsoCode}' not found in dataset ${dataset}`
      );

    const mutableFields = {
      email: user.email,
      countryJobPositionId: jobPosition.id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };

    await prisma.user.upsert({
      where: { idpUserId: user.idpUserId },
      update: mutableFields,
      create: { idpUserId: user.idpUserId, ...mutableFields },
    });
  }

  console.log(
    `✓ Ensured ${usersData.length} users exist for dataset ${dataset}`
  );
}
