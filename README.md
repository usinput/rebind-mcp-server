# @rebind.gg/mcp-server

Stdio MCP server that turns [Rebind](https://rebind.gg) into a computer-use toolkit: screenshots, verified clicks, keyboard input, window control, and direct Luau scripting on the connected machine. Input uses the relay's active transport: genuine USB HID in hardware mode or OS injection in software mode.

**Requirements**

- [Bun](https://bun.sh) >= 1.1 (the server runs via `bunx`)
- The [Rebind app](https://rebind.gg/download) running the free [Remote Control](https://www.rebind.gg/marketplace/script_AAHteeDcYPGOT7GfXZ_OK) package (`rebind install @rebind/remote-control`)

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
| `scroll` | Scroll at the cursor. Positive scrolls down, negative up. `unit` is `wheel` (default, fine wheel clicks) or `page` (one PageDown or PageUp per unit, capped at 10). |
| `read_page` | Extract the focused browser's current page as structured text (URL, forms, interactive elements, plain text) via an address-bar bookmarklet; the full dump, including cleaned HTML, lands in the clipboard. The result is read back through AppleScript (`URL of active tab of front window`), so the relay host must be macOS and the front browser must answer that query. Safari is detected but blocks the bookmarklet path. |
| `meditate` | Research a problem page until a reasoning model has the data to solve it: fetches the URL directly, pulls the script bundles behind a JS shell so its API endpoints are visible, fetches those endpoints and assets, and reads the live page with vision. Returns a markdown dossier plus JSON `{error, problem, requirements, plan, submittable, form, live_captcha_hint, confidence, sources, assets, pending_fetch, notes, cost_usd}`. `error` is non-null when no problem could be identified or the page could not be read; partial data is still returned. Gated behind `REBIND_ALLOW_DELEGATION=1` (spends OpenRouter credits). See the pipeline below. |
| `run_lua` | Run a Luau script on the connected machine and return its `return` value as JSON — the fast path for any deterministic sequence (launch apps, place windows, shell commands, pixel search). |
| `lua_docs` | Full Luau SDK type definitions for `run_lua`. |
| `list_displays` / `list_windows` / `focus_window` / `position_window` / `active_window` | Display and window enumeration, focus, and placement. |
| `get_cursor` / `wait` / `calibrate` | Cursor readback, pauses, and the mouse scale probe. |
| `delegate_task` / `rebind_versus` | Server-side reasoning helpers with no desktop access: one bounded text task, or parallel critics that attack a plan. Registered only with `REBIND_ALLOW_DELEGATION=1` (spends OpenRouter credits). |

## Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `REBIND_URL` | `ws://127.0.0.1:19561` | Relay WebSocket URL. |
| `REBIND_TOKEN` | — | Required when the relay has an auth token set (the **Auth token** field in Remote Control's Options). |
| `REBIND_AGENT_LOG` | off | Path to append one JSONL line per tool call (`{ts, tool, ok, latency_ms, note}`). No screenshot bytes, no user content. |
| `REBIND_MODEL` | `google/gemini-3.5-flash-lite` | OpenRouter slug for `delegate_task`/`rebind_versus`/`meditate` reasoning (only used with `REBIND_ALLOW_DELEGATION=1`). |
| `REBIND_VISION_MODEL` | falls back to `REBIND_MODEL` | Multimodal slug for `meditate`'s live-page/captcha vision pass. Set this when `REBIND_MODEL` is a text-only model. |
| `REBIND_ALLOW_DELEGATION` | off | Set to `1` to register the credit-spending tools: `delegate_task`, `rebind_versus`, `meditate`. |

## How it works

**Verified clicks.** `click` and `move_mouse` reach an absolute screen point by reading the real OS cursor and sending relative HID deltas (which map 1:1 to pixels), correcting against the true cursor until it lands. This sidesteps the relay's own absolute move, whose delta comes from a cached cursor position that goes stale and flings the pointer to a screen edge.

**Calibration.** A mouse scale probe runs on the first `click`/`move_mouse`. If pointer ballistics are detected (enhance pointer precision, DPI mismatch), the probe reports it, since acceleration would break the 1:1 assumption. Re-run it any time with `calibrate`.

**One queue.** There is one physical cursor and keyboard, so tool calls are serialized: parallel calls from the model run one after another instead of interleaving HID input.

**One coordinate space.** All results are reported in the pixel space of the last screenshot — the same space the model emits — so no rescaling math ever falls on the model.

**Machine-aware orientation.** At startup the server probes the connected machine through the relay (OS, shortcut modifier, available shell tools, installed apps) and serves it as the MCP `instructions` block, along with a policy: prefer `run_lua` for deterministic work, keyboard over mouse, and screenshots last. The full Luau SDK type definitions are embedded inline so the model never has to guess `run_lua` APIs (including the coroutine-safe HID path — `HID.Down`/`Up`/`MoveTo`/`Combo` work in a one-shot chunk, `HID.Press` does not). The OS is read from the relay, not `process.platform`, so the guidance is correct even when the server and the relay run on different machines.

## Solve pipeline

`meditate` gathers; it does not submit. The intended flow, all gated behind `REBIND_ALLOW_DELEGATION=1`:

1. **`meditate`** → a dossier. Evidence is gathered by **fetching, not by driving the GUI**: a direct GET returns the server's own bytes, and when that comes back a JS shell the script bundles are pulled in so the endpoints the page calls are visible to the model, which then requests them by id. Same-origin URLs are fetched **from inside the page** — the browser's own session, cookies and TLS answer them, so an endpoint that refuses a bare curl responds normally; cross-origin falls back to relay-side curl. The rendered DOM is read when a fetch cannot see the content. It then leaves the browser **open on the problem page** and returns `form` (per-field `{value, source, op}`, traced to evidence) and `submittable`. It never bakes in the captcha — that can rotate, so it is read live at submit time, and its absence does not make a dossier unsubmittable.
2. **`rebind_versus`** → feed it the dossier to attack the reconciled values before anything irreversible happens.
3. **Solve (caller-driven, by sight)** on the still-open page: re-navigate to the anchor and confirm the URL; screenshot → click field → type each `form` value; tick attachment checkboxes; read the **live** captcha off the page; then **re-extract the filled form and diff it against the dossier** — on any mismatch or unresolved conflict, stop (do not submit). Only on a clean diff, click submit and verify. When `submittable` is false there is no form to fill; surface the answer instead.

The verify-diff before an irreversible submit is a discipline the caller enforces — auto-submitting reconciled data fails closed, not open.

## Develop

```sh
bun run --cwd packages/mcp-server test        # src/ and tests/
bun run --cwd packages/mcp-server typecheck
```

## License

MIT © [US Input Company](https://usinput.com)
