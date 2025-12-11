import { faker } from "@faker-js/faker";
import type { CreateBookBody } from "../../src/features/books/createBook/createBookSchema.example.js";

export function createBookData(
  overrides?: Partial<CreateBookBody>
): CreateBookBody {
  return {
    title: faker.lorem.words({ min: 1, max: 5 }),
    author: faker.person.fullName(),
    ...overrides,
  };
}

export function createBookDataWithTitle(title: string): CreateBookBody {
  return createBookData({ title });
}

export function createBookDataWithAuthor(author: string): CreateBookBody {
  return createBookData({ author });
}

export function createMultipleBookData(count: number): CreateBookBody[] {
  return Array.from({ length: count }, () => createBookData());
}

export function createInvalidBookData(): Partial<CreateBookBody> {
  return {
    title: "",
    author: "",
  };
}

export function createBookDataWithSpecialCharacters(): CreateBookBody {
  return {
    title: "  Test Book With   Multiple   Spaces  ",
    author: "  Author Name  ",
  };
}
