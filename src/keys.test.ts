import { expect, test } from "bun:test";
import { normalizeCombo } from "./keys";

test("normalizes every Command spelling models emit", () => {
  for (const alias of ["LCmd", "Cmd", "Command", "⌘", "Super", "LWin", "Win"]) {
    expect(normalizeCombo(`${alias}+L`)).toBe("LMeta+L");
  }
  expect(normalizeCombo("RCmd+Tab")).toBe("RMeta+Tab");
});

test("passes through already-valid combos and bare keys", () => {
  expect(normalizeCombo("LCtrl+Shift+P")).toBe("LCtrl+Shift+P");
  expect(normalizeCombo("Enter")).toBe("Enter");
  expect(normalizeCombo(" LMeta + A ")).toBe("LMeta+A");
});
