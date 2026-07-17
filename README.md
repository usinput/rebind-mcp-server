# @rebind.gg/mcp-server

Stdio MCP server that exposes Rebind as computer-use tools: `screenshot`,
`screenshot_window`, `zoom`, `click` (verified), `move_mouse`, `type`, `key`,
`scroll`, `run_lua`, `wait`, window control, and `calibrate`. Wraps
`@rebind.gg/client-ts`; requires the **Rebind** app
(https://rebind.gg/download) running its Remote Access relay — `remote.luau`
(recommended) or `remote_access.lua` (protocol >= 1.1.0). The `click` tool clicks via `hid.press`, which is
coroutine-only; use `remote.luau` or a current `remote_access.lua` (older copies
called it outside a coroutine, so clicks silently failed).

## Install

One command writes the correct config for whichever clients you name — Claude
Code, Cursor, Codex, OpenCode, VS Code, Windsurf, Zed, and more — each in its
native format, via [`add-mcp`](https://github.com/neondatabase/add-mcp):

```sh
npx add-mcp "bunx @rebind.gg/mcp-server" --name rebind \
  --env REBIND_URL=ws://127.0.0.1:19561 \
  -g -a claude-code -a cursor -a codex -a opencode
```

Drop `-a <agent>` for the clients you want, or pass `--all`. `-g` installs
globally; omit it for project-local config. Restart the client afterward.

Requires **Bun** (the server runs via `bunx`) and the **Rebind** app
(https://rebind.gg/download) running its Remote Access relay.

## Configure manually

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

`REBIND_TOKEN` is required when the server has an auth token set (the **Auth
token** panel field on `remote.luau`, or `AUTH_TOKEN` on `remote_access.lua`).

Check the relay is reachable before wiring it up:

```sh
bunx @rebind.gg/mcp-server --selftest
```

Set `REBIND_AGENT_LOG=<path>` to append one JSONL line per tool call
(`{ts, tool, ok, latency_ms, note}`) — no screenshot bytes, no user content.
Off unless set.

`click` and `move_mouse` reach an absolute screen point by reading the real OS
cursor and sending relative HID deltas (which map 1:1 to pixels), correcting
against the true cursor until it lands. This sidesteps the relay's own absolute
move, whose delta is computed from a cached cursor position that goes stale and
flings the pointer to a screen edge. A mouse scale probe runs on the first
click/move_mouse; if pointer ballistics are detected (enhance pointer precision,
DPI mismatch) the probe reports it, since acceleration would break the 1:1
assumption.

Tool calls are serialized through a single queue: there is one physical cursor
and keyboard, so parallel tool calls from the model (e.g. two `move_mouse` in
one turn) run one after another instead of interleaving HID input. All results
are reported in the coordinate space of the last screenshot, the same space the
model emits.

## Develop

```sh
bun test packages/mcp-server/tests/
bun run --cwd packages/mcp-server typecheck
```
