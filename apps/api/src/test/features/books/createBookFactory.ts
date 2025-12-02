import { faker } from "@faker-js/faker";
import type { CreateBookBody } from "@/features/books/createBook/createBookSchema.example.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Provide factory functions for creating test data for books.
// EXPLANATION:
// This factory is co-located with the createBook feature to keep test utilities
// close to the code they test. It uses Faker to generate realistic test data.
// --------------------------------------------------------------------------------

/**
 * Creates a valid CreateBookBody with random data using Faker.
 * Useful for tests that need valid but arbitrary book data.
 */
export function createBookData(
  overrides?: Partial<CreateBookBody>
): CreateBookBody {
  return {
    title: faker.lorem.words({ min: 1, max: 5 }),
    author: faker.person.fullName(),
    ...overrides,
  };
}

/**
 * Creates a CreateBookBody with a specific title.
 * Useful for tests that need to verify title uniqueness or specific titles.
 */
export function createBookDataWithTitle(title: string): CreateBookBody {
  return createBookData({ title });
}

/**
 * Creates a CreateBookBody with a specific author.
 * Useful for tests that filter or search by author.
 */
export function createBookDataWithAuthor(author: string): CreateBookBody {
  return createBookData({ author });
}

/**
 * Creates multiple CreateBookBody objects.
 * Useful for tests that need to create multiple books.
 */
export function createMultipleBookData(count: number): CreateBookBody[] {
  return Array.from({ length: count }, () => createBookData());
}

/**
 * Creates a CreateBookBody with invalid data for testing validation.
 * Useful for testing error cases.
 */
export function createInvalidBookData(): Partial<CreateBookBody> {
  return {
    title: "", // Empty title should fail validation
    author: "", // Empty author should fail validation
  };
}

/**
 * Creates a CreateBookBody with special characters that might need normalization.
 * Useful for testing normalization logic.
 */
export function createBookDataWithSpecialCharacters(): CreateBookBody {
  return {
    title: "  Test Book With   Multiple   Spaces  ",
    author: "  Author Name  ",
  };
}
