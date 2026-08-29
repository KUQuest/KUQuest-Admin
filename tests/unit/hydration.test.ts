import { expect, it } from "bun:test";

const layoutSource = await Bun.file("src/app/layout.tsx").text();

it("opts into intentional pre-hydration root attribute changes", () => {
  expect(layoutSource).toMatch(/<html lang="en" suppressHydrationWarning>/);
});
