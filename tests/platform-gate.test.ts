// read_page needs App.Front and an AppleScript readback, so the server offers
// it only when the relay's uname probe says macOS. This drives the real server
// over stdio against a fake relay that answers lua.exec with a chosen uname.

import { afterEach, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let stop: (() => Promise<void>) | undefined;

afterEach(async () => {
  await stop?.();
  stop = undefined;
});

/** tool names the server registers when the relay reports `uname` */
async function toolsFor(uname: string): Promise<string[]> {
  const relay = Bun.serve({
    port: 0,
    fetch(req, server) {
      return server.upgrade(req)
        ? undefined
        : new Response("", { status: 400 });
    },
    websocket: {
      message(ws, raw) {
        const msg = JSON.parse(String(raw));
        if (msg.id === undefined) return;
        const result =
          msg.t === "lua.exec" && String(msg.source).includes("[[uname]]")
            ? uname
            : "";
        ws.send(JSON.stringify({ id: msg.id, result }));
      },
    },
  });
  const client = new Client({ name: "platform-gate", version: "0" });
  stop = async () => {
    await client.close();
    relay.stop(true);
  };
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [new URL("../src/index.ts", import.meta.url).pathname],
      env: {
        ...(process.env as Record<string, string>),
        REBIND_URL: `ws://127.0.0.1:${relay.port}`,
        // the fake relay has no auth; a token from the shell would fail connect
        REBIND_TOKEN: "",
      },
    }),
  );
  return (await client.listTools()).tools.map((t) => t.name);
}

test("a macOS relay gets read_page", async () => {
  expect(await toolsFor("Darwin")).toContain("read_page");
}, 20_000);

test("a Linux relay does not", async () => {
  expect(await toolsFor("Linux")).not.toContain("read_page");
}, 20_000);

// a probe that fails (lua.exec off, exec denied) comes back empty
test("a failed probe does not", async () => {
  expect(await toolsFor("")).not.toContain("read_page");
}, 20_000);
