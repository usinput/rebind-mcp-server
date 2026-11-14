// the observe_* tools' plain answers when Remote Control refuses an observe.*
// command for a reason the user fixes, not the agent.

import { ServerError } from "@rebind.gg/client-ts";

/** the text to show for a refusal the user must fix, or null for any other error */
export function observeRefusal(e: unknown): string | null {
  if (!(e instanceof ServerError)) return null;
  switch (e.code) {
    case "disabled":
      return "Allow observation is off in Remote Control's Options on the computer running Rebind. Ask the user to turn it on if they want to be recorded; while it is on, a connected program can record every key they press and their screen.";
    case "unknown_command":
      return "This Remote Control has no observe commands: it is older than 0.5.0. Ask the user to update the Remote Control package.";
    case "unavailable":
      return "This Rebind cannot record observations: it is older than 3.15.0. Ask the user to update Rebind.";
    default:
      return null;
  }
}
