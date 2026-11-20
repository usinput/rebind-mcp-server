// click_element's pure parts: refusals, the list an agent reads, and which
// match a click takes.

import { expect, test } from "bun:test";
import { ServerError } from "@rebind.gg/client-ts";
import {
  blocked,
  center,
  choose,
  describe,
  elementsOf,
  elementsRefusal,
  given,
  LISTED,
  listed,
  type ScreenElement,
  statusNote,
} from "../src/elements.ts";

const button = (name: string, x = 100, y = 40, id = ""): ScreenElement => ({
  name,
  role: "AXButton",
  id,
  x,
  y,
  width: 40,
  height: 21,
});

test("an older Remote Control or Rebind is named, other errors are not", () => {
  expect(
    elementsRefusal(new ServerError("unknown_command", "unknown command")),
  ).toContain("older than 0.8.0");
  expect(
    elementsRefusal(new ServerError("unavailable", "needs Rebind 3.22.5")),
  ).toContain("Rebind 3.22.5 or later");
  expect(
    elementsRefusal(
      new ServerError(
        "handler_error",
        "Screen.Elements: not supported on this platform",
      ),
    ),
  ).toContain("no element lookup");
  expect(
    elementsRefusal(new ServerError("handler_error", "something else")),
  ).toBeNull();
  expect(elementsRefusal(new Error("socket closed"))).toBeNull();
});

test("a reply's elements are a list even when the encoder sent an object", () => {
  expect(elementsOf({ elements: {} })).toEqual([]);
  expect(elementsOf({})).toEqual([]);
  expect(elementsOf({ elements: [button("OK")] })).toHaveLength(1);
});

test("a status says why the list may be short", () => {
  expect(statusNote(undefined)).toBe("");
  expect(statusNote(null)).toBe("");
  expect(statusNote("not_responding")).toContain("did not answer");
  expect(statusNote("timed_out")).toContain("out of time");
  expect(statusNote("truncated")).toContain("element limit");
  expect(statusNote("busy")).toContain("try again");
  expect(statusNote("later_addition")).toBe("Lookup status: later_addition.");
});

test("elements are listed with their centre in screen coordinates", () => {
  expect(center(button("OK"))).toEqual({ x: 120, y: 50 });
  expect(describe([button("OK"), button("", 8, 41, "AXCloseButton")])).toBe(
    '1. "OK" AXButton at screen (120, 50), 40x21\n' +
      "2. (no name) AXButton id=AXCloseButton at screen (28, 51), 40x21",
  );
  const many = Array.from({ length: LISTED + 5 }, (_, i) => button(`b${i}`));
  const lines = describe(many).split("\n");
  expect(lines).toHaveLength(LISTED + 1);
  expect(lines.at(-1)).toContain("and 5 more");
});

test("a click takes the only match or the indexed one, and nothing else", () => {
  const ok = button("OK");
  const cancel = button("Cancel", 20);
  expect(choose([ok], undefined)).toBe(ok);
  expect(choose([ok, cancel], 2)).toBe(cancel);
  expect(choose([], undefined)).toContain("No element matches");
  expect(choose([ok, cancel], undefined)).toContain("2 elements match");
  expect(choose([ok, cancel], undefined)).toContain('2. "Cancel"');
  expect(choose([ok, cancel], 3)).toContain("out of range");
  expect(choose([ok], 0)).toContain("out of range");
});

test("an unfiltered list leaves out elements with no name and no id", () => {
  const all = [button("OK"), button(""), button("", 8, 41, "AXCloseButton")];
  expect(listed(all, false)).toEqual([all[0]!, all[2]!]);
  expect(listed(all, true)).toEqual(all);
});

test("a single match from an unfinished lookup is not clicked without an index", () => {
  const ok = button("OK");
  expect(choose([ok], undefined, "truncated")).toContain("did not finish");
  expect(choose([ok], undefined, "not_responding")).toContain("index 1");
  expect(choose([ok], 1, "truncated")).toBe(ok);
  expect(choose([ok], undefined, null)).toBe(ok);
  expect(choose([ok], undefined, undefined)).toBe(ok);
});

test("an empty filter is not a filter", () => {
  expect(given(undefined)).toBe(false);
  expect(given("")).toBe(false);
  expect(given("  ")).toBe(false);
  expect(given("OK")).toBe(true);
});

test("a covered element is listed as covered and never clicked", () => {
  const hidden = { ...button("OK"), covered: true };
  expect(describe([hidden])).toContain("covered or not reachable");
  expect(blocked(hidden)).toContain("nothing was clicked");
  expect(blocked({ ...button("OK"), covered: false })).toBeNull();
  // a reply without the field, as a lookup without the hit-test sends
  expect(blocked(button("OK"))).toBeNull();
});
