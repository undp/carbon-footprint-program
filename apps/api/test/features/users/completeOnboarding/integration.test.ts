import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  inject,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { OnboardingKeys, type GetMeResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

const COMPLETE_URL = `/api/users/me/onboardings/${OnboardingKeys.WELCOME_HOME}/complete`;

describe("POST /api/users/me/onboardings/:key/complete - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let loggedUser: Awaited<ReturnType<typeof getTestLoggedUser>>;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    loggedUser = await getTestLoggedUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await prisma.userOnboardingCompletion.deleteMany({
      where: { userId: loggedUser.id },
    });
  });

  it("records the completion for the current user and returns 204", async () => {
    const response = await app.inject({ method: "POST", url: COMPLETE_URL });

    expect(response.statusCode).toBe(204);

    const rows = await prisma.userOnboardingCompletion.findMany({
      where: { userId: loggedUser.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].onboardingKey).toBe(OnboardingKeys.WELCOME_HOME);
  });

  it("is idempotent and preserves the original completedAt on re-completion", async () => {
    const first = await app.inject({ method: "POST", url: COMPLETE_URL });
    expect(first.statusCode).toBe(204);
    const afterFirst = await prisma.userOnboardingCompletion.findFirstOrThrow({
      where: { userId: loggedUser.id },
    });

    const second = await app.inject({ method: "POST", url: COMPLETE_URL });
    expect(second.statusCode).toBe(204);

    const rows = await prisma.userOnboardingCompletion.findMany({
      where: { userId: loggedUser.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].completedAt.getTime()).toBe(
      afterFirst.completedAt.getTime()
    );
  });

  it("rejects an unknown onboarding key with 400 and writes nothing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/users/me/onboardings/not-a-real-onboarding/complete",
    });

    expect(response.statusCode).toBe(400);

    const rows = await prisma.userOnboardingCompletion.findMany({
      where: { userId: loggedUser.id },
    });
    expect(rows).toHaveLength(0);
  });

  it("surfaces the completion through GET /users/me", async () => {
    await app.inject({ method: "POST", url: COMPLETE_URL });

    const response = await app.inject({ method: "GET", url: "/api/users/me" });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetMeResponse;
    expect(body?.onboardingsCompleted).toContain(OnboardingKeys.WELCOME_HOME);
  });
});
