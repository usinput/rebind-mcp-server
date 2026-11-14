// read_page needs App.Front and an AppleScript readback over lua.exec, so the
// server offers it only on a macOS relay with lua.exec on. The OS comes from
// the hello banner, or from a uname probe when the banner has no platform.
// This drives the real server over stdio against a fake relay.

import { afterEach, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let stop: (() => Promise<void>) | undefined;

afterEach(async () => {
  await stop?.();
  stop = undefined;
});

/** a hello banner as Remote Control 0.3.0+ sends it; omitted = older server */
type Banner = { platform: string; gates: { lua: boolean } };

/** a client of the server, connected to a relay that reports `uname` and `banner` */
async function connect(uname: string, banner?: Banner): Promise<Client> {
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
        if (msg.t === "hello" && banner) {
          ws.send(JSON.stringify({ id: msg.id, ...banner }));
          return;
        }
        if (msg.t === "lua.exec" && banner && !banner.gates.lua) {
          const error = { code: "disabled", message: "lua.exec is off" };
          ws.send(JSON.stringify({ id: msg.id, error }));
          return;
        }
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
  return client;
}

/** tools and instructions when the relay reports `uname` and `banner` */
async function serve(
  uname: string,
  banner?: Banner,
): Promise<{ tools: string[]; instructions: string }> {
  const client = await connect(uname, banner);
  return {
    tools: (await client.listTools()).tools.map((t) => t.name),
    instructions: client.getInstructions() ?? "",
  };
}

const toolsFor = async (uname: string) => (await serve(uname)).tools;

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

// run_lua may reach a relay older than 3.9.0, which has no rb
test("the SDK the server serves is the v1 names", async () => {
  const client = await connect("Linux");
  const docs = await client.callTool({ name: "lua_docs", arguments: {} });
  const served = [
    client.getInstructions() ?? "",
    (docs.content as { text: string }[])[0]!.text,
  ];
  for (const sdk of served) {
    expect(sdk).toContain("declare HID");
    expect(sdk).toContain("-- v1 names");
    expect(sdk).not.toContain("declare rb");
    // the shared types keep their snake_case members, marked as 3.9.0 only
    expect(sdk).toContain("and to their snake_case forms from Rebind 3.9.0");
  }
}, 20_000);

// the default Remote Control setup has lua.exec off: the banner still names
// the OS, so the agent is told it drives a Mac, and read_page stays hidden
test("hello names macOS when lua.exec is off", async () => {
  const { tools, instructions } = await serve("", {
    platform: "macos",
    gates: { lua: false },
  });
  expect(instructions).toContain("real macOS computer");
  expect(tools).not.toContain("read_page");
}, 20_000);

test("hello's platform wins over uname", async () => {
  const { tools } = await serve("Linux", {
    platform: "macos",
    gates: { lua: true },
  });
  expect(tools).toContain("read_page");
}, 20_000);
