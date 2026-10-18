import { expect, test } from "bun:test";

// src/rebind.d.luau is a byte-identical copy shipped with the package so the
// lua_docs tool works outside the monorepo. Re-copy from lua-sdk when it drifts.
test("src/rebind.d.luau is in sync with lua-sdk types", async () => {
  const shipped = await Bun.file(
    new URL("../src/rebind.d.luau", import.meta.url),
  ).text();
  const source = await Bun.file(
    new URL("../../lua-sdk/types/rebind.d.luau", import.meta.url),
  ).text();
  expect(shipped).toBe(source);
});
