import { expect, test } from "bun:test";

// src/rebind.d.luau and src/cli.mdx are byte-identical copies shipped with the
// package so rebind_docs works outside the monorepo. `just sdk-gen` copies both
// again when one drifts.
test("src/rebind.d.luau is in sync with lua-sdk types", async () => {
  const shipped = await Bun.file(
    new URL("../src/rebind.d.luau", import.meta.url),
  ).text();
  const source = await Bun.file(
    new URL("../../lua-sdk/types/rebind.d.luau", import.meta.url),
  ).text();
  expect(shipped).toBe(source);
});

test("src/cli.mdx is in sync with the docs site's CLI reference", async () => {
  const shipped = await Bun.file(
    new URL("../src/cli.mdx", import.meta.url),
  ).text();
  const source = await Bun.file(
    new URL("../../../www/docs-v2/reference/cli.mdx", import.meta.url),
  ).text();
  expect(shipped).toBe(source);
});
