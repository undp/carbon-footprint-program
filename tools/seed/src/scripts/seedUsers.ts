import { type PrismaClient, type Prisma, SystemRole } from "@repo/database";
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
  Pick<Prisma.UserCreateInput, "firstName" | "lastName" | "idpUserId">
> & {
  email: string;
  countryJobPositionName: Prisma.CountryJobPositionCreateInput["name"];
  countryIsoCode: Prisma.CountryCreateInput["isoCode"];
  role: SystemRole;
})[];

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

  // Prepare users data with countryJobPositionId
  const usersToCreate = usersData.map((user) => {
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

    return {
      idpUserId: user.idpUserId,
      email: user.email,
      countryJobPositionId: jobPosition.id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
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
