import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  inject,
} from "vitest";
import { createTestApp } from "@/test/factories/appFactory.js";
import {
  createBookData,
  createBookDataWithTitle,
  createInvalidBookData,
} from "@/test/factories/bookFactory.js";
import type { CreateBookResponse } from "@/features/books/createBook/createBookSchema.example.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("POST /api/books - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe("BEGIN");
  });

  afterEach(async () => {
    await prisma.$executeRawUnsafe("ROLLBACK");
  });

  describe("Successful book creation", () => {
    it("should create a book successfully with valid data", async () => {
      const bookData = createBookData();

      const response = await app.inject({
        method: "POST",
        url: "/api/books",
        payload: bookData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateBookResponse;
      expect(body).toMatchObject({
        title: bookData.title,
        author: bookData.author,
      });
      expect(body.id).toBeDefined();
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeDefined();
    });
  });

  describe("Business validations", () => {
    it("should reject a book with duplicate title", async () => {
      const bookData = createBookDataWithTitle("El Quijote");

      // Create the first book
      await app.inject({
        method: "POST",
        url: "/api/books",
        payload: bookData,
      });

      // Try to create another with the same title
      const response = await app.inject({
        method: "POST",
        url: "/api/books",
        payload: bookData,
      });

      expect(response.statusCode).toBe(500); // Error due to uniqueness constraint in database
    });

    it("should reject invalid data (empty fields)", async () => {
      const invalidData = createInvalidBookData();

      const response = await app.inject({
        method: "POST",
        url: "/api/books",
        payload: invalidData,
      });

      // Fastify/Zod validation should reject before reaching the handler
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Database persistence", () => {
    it("should persist the book in the database", async () => {
      const bookData = createBookData();

      const response = await app.inject({
        method: "POST",
        url: "/api/books",
        payload: bookData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateBookResponse;

      // Verify directly in the database
      const bookInDb = await prisma.book.findUnique({
        where: { id: body.id },
      });

      expect(bookInDb).toBeDefined();
      expect(bookInDb?.title).toBe(bookData.title);
      expect(bookInDb?.author).toBe(bookData.author);
    });
  });

  describe("Error handling", () => {
    it("should handle validation errors correctly", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/books",
        payload: {}, // Completely empty data
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
