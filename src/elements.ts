// click_element's pure parts: what Remote Control's screen.elements reply
// means, how matches read to an agent, and which one a click takes.

import { ServerError } from "@rebind.gg/client-ts";

/** one control from the accessibility tree, in screen coordinates */
export type ScreenElement = {
  name: string;
  role: string;
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** from a lookup that asked for the hit-test: it was not found at its own
   *  centre, usually because another window is over it */
  covered?: boolean;
};

/** the most elements one answer lists */
export const LISTED = 60;

/** the text to show when this Remote Control or Rebind has no lookup, or null
 *  for any other error */
export function elementsRefusal(e: unknown): string | null {
  if (!(e instanceof ServerError)) return null;
  switch (e.code) {
    case "unknown_command":
      return "This Remote Control has no element lookup: it is older than 0.8.0. Ask the user to update the Remote Control package, and use the keyboard or a screenshot for now.";
    case "unavailable":
      return "This Rebind has no element lookup: it needs Rebind 3.22.5 or later. Ask the user to update Rebind, and use the keyboard or a screenshot for now.";
    default:
      // a relay on a platform with no accessibility tree raises this
      return /not supported on this platform/.test(e.message)
        ? "This computer's Rebind has no element lookup. Use the keyboard or a screenshot."
        : null;
  }
}

/** the reply's elements: a list, or the empty object an older encoder sends
 *  for an empty list */
export function elementsOf(reply: Record<string, unknown>): ScreenElement[] {
  return Array.isArray(reply.elements)
    ? (reply.elements as ScreenElement[])
    : [];
}

/** What a list shows. With no filter, only elements an agent can ask for
 *  again: ones with a name or an id. A filtered lookup shows every match. */
export function listed(
  elements: ScreenElement[],
  filtered: boolean,
): ScreenElement[] {
  return filtered ? elements : elements.filter((e) => e.name || e.id);
}

const STATUS: Record<string, string> = {
  not_responding:
    "An app did not answer, so its elements are missing from this list.",
  timed_out: "The lookup ran out of time, so this list may be incomplete.",
  truncated:
    "The lookup stopped at its element limit, so this list may be incomplete: narrow it with name or id.",
  busy: "Two other lookups are still running, so this one was not started: try again in a moment.",
};

/** what a status means for the list, or "" for a complete lookup */
export function statusNote(status: unknown): string {
  return typeof status === "string"
    ? (STATUS[status] ?? `Lookup status: ${status}.`)
    : "";
}

export function center(e: ScreenElement): { x: number; y: number } {
  return {
    x: e.x + Math.floor(e.width / 2),
    y: e.y + Math.floor(e.height / 2),
  };
}

/** one line per element, numbered from 1, for an agent to choose from */
export function describe(elements: ScreenElement[]): string {
  const lines = elements.slice(0, LISTED).map((e, i) => {
    const at = center(e);
    const label = e.name ? JSON.stringify(e.name) : "(no name)";
    return `${i + 1}. ${label} ${e.role}${e.id ? ` id=${e.id}` : ""} at screen (${at.x}, ${at.y}), ${e.width}x${e.height}${e.covered ? ", covered or not reachable at its centre" : ""}`;
  });
  if (elements.length > LISTED)
    lines.push(
      `…and ${elements.length - LISTED} more: narrow with name or id.`,
    );
  return lines.join("\n");
}

/** whether a filter was really given: an empty string matches everything */
export function given(filter: string | undefined): boolean {
  return filter !== undefined && filter.trim() !== "";
}

/** The element a click takes: the only match of a finished lookup, or the
 *  one `index` names (from 1). An error string when there is none or the
 *  choice is open. */

export function choose(
  elements: ScreenElement[],
  index: number | undefined,
  status?: unknown,
): ScreenElement | string {
  // a list cut short may hide a second match, so "the only one" is unknown
  if (index === undefined && elements.length === 1 && status != null)
    return `One element matches, but the lookup did not finish, so nothing was clicked. Pass index 1 to click it anyway:\n${describe(elements)}`;
  if (elements.length === 0)
    return "No element matches. Apps that draw their own interface (games, many web and Electron apps) name little or nothing: use the keyboard, or take a screenshot and click.";
  if (index !== undefined)
    return (
      elements[index - 1] ??
      `index ${index} is out of range: ${elements.length} element${elements.length === 1 ? "" : "s"} matched.`
    );
  if (elements.length > 1)
    return `${elements.length} elements match, so nothing was clicked. Narrow with exact or id, or pass index:\n${describe(elements)}`;
  return elements[0]!;
}

/** why a chosen element must not be clicked, or null: a click at the centre
 *  of a covered control lands on the window over it */
export function blocked(e: ScreenElement): string | null {
  return e.covered
    ? `${e.name ? JSON.stringify(e.name) : "The element"} is not what the system reports at its own centre, so nothing was clicked. Usually another window covers it: bring its window to the front and try again, or take a screenshot.`
    : null;
}
