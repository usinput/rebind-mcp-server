// When nothing answers on REBIND_URL at startup, the server serves setup
// mode: instructions that say so and install_remote_control, which runs the
// rebind CLI. This drives the real server over stdio with a fake `rebind`.
// PATH holds only the fake's directory, so the real CLI is never reached.

import { afterEach, expect, test } from "bun:test";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let stop: (() => Promise<void>) | undefined;

afterEach(async () => {
  await stop?.();
  stop = undefined;
});

/** a loopback URL on a port that was free a moment ago: nothing answers */
function closedUrl(): string {
  const s = Bun.serve({ port: 0, fetch: () => new Response("") });
  const url = `ws://127.0.0.1:${s.port}`;
  s.stop(true);
  return url;
}

/** a directory holding a fake `rebind` that logs its arguments, and the log;
 *  `installed` makes --allow fail the way the relay does for an existing install */
function fakeRebind(installed = false): { dir: string; log: string } {
  const dir = mkdtempSync(join(tmpdir(), "rebind-setup-"));
  const log = join(dir, "args.log");
  writeFileSync(
    join(dir, "rebind"),
    `#!/bin/sh
echo "$*" >> "${log}"
echo "It asks for:"
echo "  net"
case "$*" in
  *--allow*) ${installed ? 'echo "error: Listing is already installed" >&2; exit 1' : 'echo "installed @rebind/remote-control -> marketplace/listing-x"; exit 0'} ;;
esac
echo "error: not installed: run it again with --allow to grant these" >&2
exit 1
`,
  );
  chmodSync(join(dir, "rebind"), 0o755);
  return { dir, log };
}

async function connect(url: string, path: string): Promise<Client> {
  const client = new Client({ name: "setup", version: "0" });
  stop = async () => {
    await client.close();
  };
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [new URL("../src/index.ts", import.meta.url).pathname],
      env: {
        ...(process.env as Record<string, string>),
        REBIND_URL: url,
        REBIND_TOKEN: "",
        PATH: path,
      },
    }),
  );
  return client;
}

type Result = { content: { text: string }[]; isError?: boolean };
const install = async (client: Client, args = {}) =>
  (await client.callTool({
    name: "install_remote_control",
    arguments: args,
  })) as Result;

test("setup mode offers only the install and says to ask first", async () => {
  const { dir } = fakeRebind();
  const url = closedUrl();
  const client = await connect(url, dir);
  const tools = (await client.listTools()).tools.map((t) => t.name);
  expect(tools).toEqual(["install_remote_control"]);
  const instructions = client.getInstructions() ?? "";
  expect(instructions).toContain(`not answering on ${url}`);
  expect(instructions).toContain("Never install on your own");
  rmSync(dir, { recursive: true });
}, 20_000);

test("without allow it installs nothing and returns the permissions", async () => {
  const { dir, log } = fakeRebind();
  const client = await connect(closedUrl(), dir);
  const r = await install(client);
  expect(r.isError).toBeFalsy();
  expect(r.content[0]!.text).toContain("It asks for:");
  expect(r.content[0]!.text).toContain("Nothing was installed");
  expect(readFileSync(log, "utf8").trim()).toBe(
    "install @rebind/remote-control",
  );
  rmSync(dir, { recursive: true });
}, 20_000);

test("with allow it installs and says what the user does next", async () => {
  const { dir, log } = fakeRebind();
  const client = await connect(closedUrl(), dir);
  const r = await install(client, { allow: true });
  expect(r.isError).toBeFalsy();
  expect(r.content[0]!.text).toContain("installed @rebind/remote-control");
  expect(r.content[0]!.text).toContain("Auth token");
  expect(r.content[0]!.text).toContain("REBIND_TOKEN");
  expect(readFileSync(log, "utf8").trim()).toBe(
    "install @rebind/remote-control --allow",
  );
  rmSync(dir, { recursive: true });
}, 20_000);

test("an install that already exists gets the same next steps", async () => {
  const { dir } = fakeRebind(true);
  const client = await connect(closedUrl(), dir);
  const r = await install(client, { allow: true });
  expect(r.isError).toBeFalsy();
  expect(r.content[0]!.text).toContain("Listing is already installed");
  expect(r.content[0]!.text).toContain("Auth token");
  rmSync(dir, { recursive: true });
}, 20_000);

test("without the rebind command it says how to install by hand", async () => {
  const empty = mkdtempSync(join(tmpdir(), "rebind-setup-"));
  const client = await connect(closedUrl(), empty);
  const r = await install(client, { allow: true });
  expect(r.isError).toBe(true);
  expect(r.content[0]!.text).toContain("not on this computer's PATH");
  rmSync(empty, { recursive: true });
}, 20_000);

test("another computer gets the manual steps, not the CLI", async () => {
  const { dir, log } = fakeRebind();
  const client = await connect("ws://rebind.invalid:19570", dir);
  const r = await install(client, { allow: true });
  expect(r.content[0]!.text).toContain(
    "rebind install @rebind/remote-control --allow",
  );
  expect(r.content[0]!.text).toContain("Local only");
  expect(r.content[0]!.text).toContain("set WS port to 19570");
  expect(() => readFileSync(log)).toThrow();
  rmSync(dir, { recursive: true });
}, 20_000);
