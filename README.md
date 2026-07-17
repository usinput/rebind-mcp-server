# @rebind.gg/mcp-server

Stdio MCP server that turns [Rebind](https://rebind.gg) into a computer-use toolkit: screenshots, verified clicks, keyboard input, window control, and direct Luau scripting on the connected machine — driven over real HID, not synthetic OS events.

**Requirements**

- [Bun](https://bun.sh) >= 1.1 (the server runs via `bunx`)
- The [Rebind app](https://rebind.gg/download) running its Remote Access relay: `remote.luau` (recommended) or `remote_access.lua` (protocol >= 1.1.0)

> Older copies of `remote_access.lua` called `hid.press` outside a coroutine, so clicks silently failed. Use `remote.luau` or a current `remote_access.lua`.

## Install

One command writes the correct config for whichever clients you name — Claude Code, Cursor, Codex, OpenCode, VS Code, Windsurf, Zed, and more — via [`add-mcp`](https://github.com/neondatabase/add-mcp):

```sh
npx add-mcp "bunx @rebind.gg/mcp-server" --name rebind \
  --env REBIND_URL=ws://127.0.0.1:19561 \
  -g -a claude-code -a cursor -a codex -a opencode
```

Drop `-a <agent>` for the clients you want, or pass `--all`. `-g` installs globally; omit it for project-local config. Restart the client afterward.

### Manual configuration

Any MCP client takes the stdio block directly:

```json
{
  "mcpServers": {
    "rebind": {
      "command": "bunx",
      "args": ["@rebind.gg/mcp-server"],
      "env": { "REBIND_URL": "ws://127.0.0.1:19561" }
    }
  }
}
```

### Verify the relay is reachable

```sh
bunx @rebind.gg/mcp-server --selftest
```

Connects, takes a capture, and reports the display — the fastest way to catch the #1 first-run failure (relay not loaded).

## Tools

| Tool | What it does |
| --- | --- |
| `screenshot` | Capture a display (cursor marked with a crosshair). All coordinates the model emits are pixels in the most recent screenshot. |
| `screenshot_window` | Capture one window by title substring (or the active window) — smaller, cheaper, monitor-proof. |
| `zoom` | Re-capture a region of the last screenshot at native resolution, for small text. Read-only. |
| `click` | Move to a point and click (`left`/`right`/`middle`, optional double). Landing position is verified and corrected before pressing. |
| `move_mouse` | Move without clicking, with the same verification. |
| `type` | Type text into the focused element. |
| `key` | Press a key or combo, e.g. `Enter`, `LCtrl+L`, `LAlt+Tab`. |
| `scroll` | Scroll the wheel at the cursor (positive = up). |
| `run_lua` | Run a Luau script on the connected machine and return its `return` value as JSON — the fast path for any deterministic sequence (launch apps, place windows, shell commands, pixel search). |
| `lua_docs` | Full Luau SDK type definitions for `run_lua`. |
| `list_displays` / `list_windows` / `focus_window` / `active_window` | Display and window enumeration and control. |
| `get_cursor` / `wait` / `calibrate` | Cursor readback, pauses, and the mouse scale probe. |

## Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `REBIND_URL` | `ws://127.0.0.1:19561` | Relay WebSocket URL. |
| `REBIND_TOKEN` | — | Required when the relay has an auth token set (the **Auth token** panel field on `remote.luau`, or `AUTH_TOKEN` on `remote_access.lua`). |
| `REBIND_AGENT_LOG` | off | Path to append one JSONL line per tool call (`{ts, tool, ok, latency_ms, note}`). No screenshot bytes, no user content. |

## How it works

**Verified clicks.** `click` and `move_mouse` reach an absolute screen point by reading the real OS cursor and sending relative HID deltas (which map 1:1 to pixels), correcting against the true cursor until it lands. This sidesteps the relay's own absolute move, whose delta comes from a cached cursor position that goes stale and flings the pointer to a screen edge.

**Calibration.** A mouse scale probe runs on the first `click`/`move_mouse`. If pointer ballistics are detected (enhance pointer precision, DPI mismatch), the probe reports it, since acceleration would break the 1:1 assumption. Re-run it any time with `calibrate`.

**One queue.** There is one physical cursor and keyboard, so tool calls are serialized: parallel calls from the model run one after another instead of interleaving HID input.

**One coordinate space.** All results are reported in the pixel space of the last screenshot — the same space the model emits — so no rescaling math ever falls on the model.

## Develop

```sh
bun test packages/mcp-server/tests/
bun run --cwd packages/mcp-server typecheck
```

## License

MIT © [US Input Company](https://usinput.com)
