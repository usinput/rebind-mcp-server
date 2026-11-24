// read_page needs App.Front and an AppleScript readback over lua.exec, so the
// server offers it only on a macOS relay with lua.exec on. The OS comes from
// the hello banner, or from a uname probe when the banner has no platform.
// This drives the real server over stdio against a fake relay.

import { afterEach, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  instructions,
  OBSERVE_DOCTRINE,
  RB_NAMES_NOTE,
} from "../src/prompts.ts";
import { readDocs } from "./docs.ts";

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

// the agent reads both sets of names: run_lua may reach a relay older than
// 3.9.0, which has no rb, and the note says which set to use there
test("rebind_docs serves the CLI reference and the whole SDK in small parts", async () => {
  const parts = await readDocs(await connect("Linux"));
  const docs = parts.join("\n");
  expect(docs).toContain("rebind pack [OPTIONS] [PATH]");
  expect(docs).not.toContain('title: "CLI Reference"');
  expect(docs).toContain("declare rb");
  expect(docs).toContain("-- v1 names");
  expect(docs).toContain("declare HID");
  expect(docs).toContain(RB_NAMES_NOTE);
  expect(docs).toContain(OBSERVE_DOCTRINE);
  // a part plus its one-line header stays under what clients show inline
  for (const part of parts) expect(part.length).toBeLessThan(20_200);
}, 20_000);

test("every other tool refuses until each part has been served", async () => {
  const client = await connect("Linux");
  const wait = () => client.callTool({ name: "wait", arguments: { ms: 1 } });
  const refused = await wait();
  expect(refused.isError).toBe(true);
  expect((refused.content as { text: string }[])[0]!.text).toContain(
    "call rebind_docs for part 1",
  );
  await readDocs(client);
  expect((await wait()).isError).toBeFalsy();
}, 20_000);

// clients cut the instructions (Claude Code at 4,096 characters), and they
// no longer hold anything the computer's probes can lengthen
test("the instructions fit a client's cut and say to read the docs", () => {
  const text = instructions("macOS", 12);
  expect(text.length).toBeLessThan(2048);
  expect(text).toContain("call rebind_docs once for each part, 1 to 12");
  expect(text).toContain("Never run rebind pack");
  expect(text).toContain("without moralizing");
});

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
