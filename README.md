# @rebind.gg/mcp-server

Stdio MCP server that turns [Rebind](https://rebind.gg) into a computer-use toolkit: screenshots, verified clicks, keyboard input, window control, and direct Luau scripting on the connected machine. Input uses the relay's active transport: genuine USB HID in hardware mode or OS injection in software mode.

**Requirements**

- [Bun](https://bun.sh) >= 1.1 (the server runs via `bunx`)
- The [Rebind app](https://rebind.gg/download) running the free [Remote Control](https://www.rebind.gg/marketplace/script_AAHteeDcYPGOT7GfXZ_OK) package (`rebind install @rebind/remote-control --allow`)

When nothing answers on `REBIND_URL` at startup (Rebind is not running, or Remote Control is not installed or not started), the server starts in setup mode instead of exiting. Its instructions say Remote Control is not answering and tell the agent to ask the user before installing, and its only tool is `install_remote_control`. Called without `allow`, that tool runs `rebind install @rebind/remote-control`, which installs nothing and prints the permissions the package asks for; called with `allow: true` after the user agrees, it installs. It never starts Remote Control. The result tells the user to set an **Auth token** in its Options, start it, put the token in `REBIND_TOKEN`, and restart the MCP server. When `REBIND_URL` names another computer, the tool returns those steps for the user to follow there instead of running the CLI.

Remote Control accepts connections from its own computer only unless **Local only** is turned off in its Options, which an agent on another computer or inside WSL needs. `run_lua`, `focus_window`, `position_window` and `read_page` also need **Allow custom Luau** turned on there; the server reads that setting at startup. The `observe_*` tools need **Allow observation** turned on there, Remote Control 0.5.0 and Rebind 3.15.0.

## Install

One command writes the correct config for whichever clients you name (Claude Code, Cursor, Codex, OpenCode, VS Code, Windsurf, Zed, and more) via [`add-mcp`](https://github.com/neon-solutions/add-mcp):

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

Connects, takes a capture, and reports the display. Use it to check the most common first-run failure (relay not loaded).

## Tools

| Tool | What it does |
| --- | --- |
| `screenshot` | Capture a display (cursor marked with a crosshair). All coordinates the model emits are pixels in the most recent screenshot. |
| `screenshot_window` | Capture one window by title substring (or the active window): smaller, cheaper, monitor-proof. |
| `zoom` | Re-capture a region of the last screenshot at native resolution, for small text. Read-only. |
| `click` | Move to a point and click (`left`/`right`/`middle`, optional double). Landing position is verified and corrected before pressing. |
| `click_element` | Find a control by the name it gives the operating system (button, menu title, tab, Dock or taskbar icon) and click its center, with no screenshot. Clicks only when one control matches a given `name` or `id` and the lookup finished, or `index` names one, and never a control another window covers; `click: false` lists the matches. Needs Remote Control 0.8.0 (protocol 2.4.0) and Rebind 3.22.5. |
| `move_mouse` | Move without clicking, with the same verification. |
| `type` | Type text into the focused element. |
| `key` | Press a key or combo, e.g. `Enter`, `LCtrl+L`, `LAlt+Tab`. |
| `scroll` | Scroll at the cursor. Positive scrolls down, negative up. `unit` is `wheel` (default, fine wheel clicks) or `page` (one PageDown or PageUp per unit, capped at 10). |
| `read_page` | Extract the focused browser's current page as structured text (URL, forms, interactive elements, plain text) via an address-bar bookmarklet; the full dump, including cleaned HTML, lands in the clipboard. The result is read back through AppleScript (`URL of active tab of front window`), so the tool is registered only when the relay host is macOS and **Allow custom Luau** is on, and the front browser must answer that query. Safari is detected but blocks the bookmarklet path. |
| `meditate` | Research a problem page until a reasoning model has the data to solve it: fetches the URL directly, pulls the script bundles behind a JS shell so its API endpoints are visible, fetches those endpoints and assets, and reads the live page with vision. The browser steps (rendering a JS shell, same-origin fetches through the page, and the vision pass) need a macOS relay; elsewhere it reads pages over HTTP only. Returns a markdown dossier plus JSON `{error, problem, requirements, plan, submittable, form, live_captcha_hint, confidence, sources, assets, pending_fetch, notes, cost_usd}`. `error` is non-null when no problem could be identified or the page could not be read; partial data is still returned. Gated behind `REBIND_ALLOW_DELEGATION=1` (spends OpenRouter credits). See the pipeline below. |
| `run_lua` | Run a Luau script on the connected machine and return its `return` value as JSON. Use it for any deterministic sequence (launch apps, place windows, shell commands, pixel search). |
| `rebind_docs` | What the agent reads before anything else, in parts: how to work on this computer, the full `rebind` CLI reference, and the full Luau SDK type definitions under the `rb` names and the v1 names. Every other tool except `observe_wait` refuses until each part has been served. |
| `observe_start` / `observe_stop` | Start and stop a recording of the user: every key and button they press (passwords included), mouse movement, the active window, and screenshots, saved in Rebind's observations folder. The server's instructions tell the agent to ask before starting one. It also stops when the server disconnects. |
| `observe_wait` | Wait, up to `seconds` (at most and by default 180), until the recording the server started ends, however it ends, and return its summary from the observations folder: reason, end time and counts. It returns within a few seconds of the end, never stops the recording, and says when the recording is still running so the agent calls it again. |
| `observe_mark` | Add a note (`mark`, `success`, `failure`, `ai` or `own`, with a label and JSON data) to the recording the server started. |
| `observe_list` | Every recording in the observations folder, newest first, including ones made in the app or with `rebind observe`. |
| `observe_events` | A recording's log lines from `from_seq`, 64 KB at a time unless `max_bytes` says otherwise, and `next`, the seq to read on from. |
| `observe_frame` | One screenshot from a recording, as a `frame` or `crop` line names it, returned as an image. |
| `list_displays` / `list_windows` / `focus_window` / `position_window` / `active_window` | Display and window enumeration, focus, and placement. |
| `get_cursor` / `wait` / `calibrate` | Cursor readback, pauses, and the mouse scale probe. |
| `install_remote_control` | Setup mode only: install the Remote Control package through the `rebind` CLI (see Requirements). |
| `delegate_task` / `rebind_versus` | Server-side reasoning helpers with no desktop access: one bounded text task, or parallel critics that attack a plan. Registered only with `REBIND_ALLOW_DELEGATION=1` (spends OpenRouter credits). |

## Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `REBIND_URL` | `ws://127.0.0.1:19561` | Relay WebSocket URL. |
| `REBIND_TOKEN` | none | Required when the relay has an auth token set (the **Auth token** field in Remote Control's Options). |
| `REBIND_AGENT_LOG` | off | Path to append one JSONL line per tool call (`{ts, tool, ok, latency_ms, note}`). No screenshot bytes, no user content. |
| `REBIND_MODEL` | `google/gemini-3.5-flash-lite` | OpenRouter slug for `delegate_task`/`rebind_versus`/`meditate` reasoning (only used with `REBIND_ALLOW_DELEGATION=1`). |
| `REBIND_VISION_MODEL` | falls back to `REBIND_MODEL` | Multimodal slug for `meditate`'s live-page/captcha vision pass. Set this when `REBIND_MODEL` is a text-only model. |
| `OPENROUTER_API_KEY` | none | Required by the delegation tools (`delegate_task`, `rebind_versus`, `meditate`). |
| `REBIND_ALLOW_DELEGATION` | off | Set to `1` to register the credit-spending tools: `delegate_task`, `rebind_versus`, `meditate`. |

## How it works

**Verified clicks.** `click` and `move_mouse` reach an absolute screen point by reading the real OS cursor and sending relative HID deltas (which map 1:1 to pixels), correcting against the true cursor until it lands. This sidesteps the relay's own absolute move, whose delta comes from a cached cursor position that goes stale and flings the pointer to a screen edge.

**Calibration.** A mouse scale probe runs on the first `click`/`move_mouse`. If pointer ballistics are detected (enhance pointer precision, DPI mismatch), the probe reports it, since acceleration would break the 1:1 assumption. Re-run it any time with `calibrate`.

**One queue.** There is one physical cursor and keyboard, so tool calls are serialized: parallel calls from the model run one after another instead of interleaving HID input.

**Docs first.** MCP clients cut a server's `instructions` (Claude Code at 4,096 characters), so the server keeps them short: the OS and its shortcut modifier, the order to call `rebind_docs` for every part, and three rules (ask before recording, do not package unasked, follow the script loop). Until each part has been served, every tool except `rebind_docs` and `observe_wait` answers with an error that names the parts still to read. Reading them costs about 30,000 tokens at the start of a session. The check is per server process: it shows each part was served once, not that the agent still holds it, so a subagent that shares the server is not asked again, and a restarted server asks again.

**Machine-aware orientation.** Part 1 is built at startup. The server reads the OS from Remote Control's `hello` banner and, when custom Luau is allowed and the machine is not Windows, probes the connected machine through the relay (available shell tools, installed apps). It adds a policy: prefer `run_lua` for deterministic work, keyboard over mouse, and screenshots last. The OS is read from the relay, not `process.platform`, so the guidance is correct even when the server and the relay run on different machines. The SDK parts hold both sets of names, and the agent is told to use the v1 names in `run_lua` unless it knows Rebind is 3.9.0 or later.

## Save what worked

When the user wants a working sequence kept, part 1 tells the agent to save it as a script folder and run it with `rebind check` and `rebind run`, started in the background and ended with `rebind script stop`. The agent runs `rebind pack`, `rebind install` of a `.rbp` file, or `rebind publish` only when the user asks for a package or is ready to distribute the script. A script run this way stops when its run ends, so the agent says that installing a package is how it stays loaded.

## Write a script by watching

When the user wants help writing a script for something they do by hand, the agent asks to record them doing it, writes the script from the recording, has them try it, and repeats until they are happy with it. Recording needs **Allow observation**; when the user leaves it off, the agent works from their description.

## Solve pipeline

`meditate` gathers; it does not submit. The intended flow, all gated behind `REBIND_ALLOW_DELEGATION=1`:

1. **`meditate`** → a dossier. Evidence is gathered by **fetching, not by driving the GUI**: a direct GET returns the server's own bytes, and when that comes back a JS shell the script bundles are pulled in so the endpoints the page calls are visible to the model, which then requests them by id. On a macOS relay, same-origin URLs are fetched **from inside the page**: the browser's own session, cookies and TLS answer them, so an endpoint that refuses a bare curl responds normally; cross-origin falls back to relay-side curl. The rendered DOM is read when a fetch cannot see the content, also on a macOS relay only. It then leaves the browser **open on the problem page** and returns `form` (per-field `{value, source, op}`, traced to evidence) and `submittable`. It never bakes in the captcha; it can rotate, so it is read live at submit time, and its absence does not make a dossier unsubmittable.
2. **`rebind_versus`** → feed it the dossier to attack the reconciled values before anything irreversible happens.
3. **Solve (caller-driven, by sight)** on the still-open page: re-navigate to the anchor and confirm the URL; screenshot → click field → type each `form` value; tick attachment checkboxes; read the **live** captcha off the page; then **re-extract the filled form and diff it against the dossier**; on any mismatch or unresolved conflict, stop (do not submit). Only on a clean diff, click submit and verify. When `submittable` is false there is no form to fill; surface the answer instead.

The verify-diff before an irreversible submit is a discipline the caller enforces; auto-submitting reconciled data fails closed, not open.

## Develop

```sh
bun run --cwd packages/mcp-server test        # tests/
bun run --cwd packages/mcp-server typecheck
```

## License

MIT © [US Input Company](https://usinput.com)
