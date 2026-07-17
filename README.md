# @rebind.gg/mcp-server

Stdio MCP server that exposes Rebind as computer-use tools: `screenshot`,
`screenshot_window`, `zoom`, `click` (verified), `move_mouse`, `type`, `key`,
`scroll`, `run_lua`, `wait`, window control, and `calibrate`. Wraps
`@rebind.gg/client-ts`; requires a remote-control
server running in Rebind — `remote.luau` (recommended) or `remote_access.lua`
(protocol >= 1.1.0). The `click` tool clicks via `hid.press`, which is
coroutine-only; use `remote.luau` or a current `remote_access.lua` (older copies
called it outside a coroutine, so clicks silently failed).

## Use

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
flings the pointer to a screen edge. A mouse scale probe still runs at startup;
if pointer ballistics are detected (enhance pointer precision, DPI mismatch) the
probe reports it, since acceleration would break the 1:1 assumption.

## Develop

```sh
bun test packages/mcp-server/tests/
bun run --cwd packages/mcp-server typecheck
```
