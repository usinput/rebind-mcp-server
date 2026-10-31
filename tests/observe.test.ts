// the observe_* tools call Remote Control's observe.* commands and say
// plainly when Remote Control refuses for a reason the user fixes. This
// drives the real server over stdio against a fake relay.

import { afterEach, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ServerError } from "@rebind.gg/client-ts";
import sharp from "sharp";
import { observeRefusal } from "../src/observe.ts";

let stop: (() => Promise<void>) | undefined;

afterEach(async () => {
  await stop?.();
  stop = undefined;
});

type Request = Record<string, unknown> & { t: string; id?: number };
/** a reply's fields, or an error to send */
type Answer =
  | Record<string, unknown>
  | { error: { code: string; message: string } };

/** a server connected to a relay that answers observe.* with `answer`; every
 *  observe.* request it saw lands in `seen` */
async function connect(
  answer: (req: Request) => Answer | Promise<Answer>,
): Promise<{ client: Client; seen: Request[] }> {
  const seen: Request[] = [];
  const relay = Bun.serve({
    port: 0,
    fetch(req, server) {
      return server.upgrade(req)
        ? undefined
        : new Response("", { status: 400 });
    },
    websocket: {
      async message(ws, raw) {
        const msg = JSON.parse(String(raw)) as Request;
        if (msg.id === undefined) return;
        if (!msg.t.startsWith("observe.")) {
          ws.send(JSON.stringify({ id: msg.id, result: "" }));
          return;
        }
        seen.push(msg);
        ws.send(JSON.stringify({ id: msg.id, ...(await answer(msg)) }));
      },
    },
  });
  const client = new Client({ name: "observe", version: "0" });
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
        REBIND_TOKEN: "",
      },
    }),
  );
  return { client, seen };
}

type Result = {
  content: { type: string; text?: string; data?: string; mimeType?: string }[];
  isError?: boolean;
};

const call = async (client: Client, name: string, args = {}) =>
  (await client.callTool({ name, arguments: args })) as Result;

const status = {
  id: "20261030-120000-0001",
  dir: "/obs/20261030-120000-0001",
  owner: "remote-control",
  owner_kind: "script",
  seconds: 60,
};

test("the six tools are offered and the agent is told to ask first", async () => {
  const { client } = await connect(() => ({}));
  const tools = (await client.listTools()).tools.map((t) => t.name);
  for (const name of [
    "observe_start",
    "observe_mark",
    "observe_stop",
    "observe_list",
    "observe_events",
    "observe_frame",
  ])
    expect(tools).toContain(name);
  const instructions = client.getInstructions() ?? "";
  expect(instructions).toContain("Never start one on your own: ask first");
  expect(instructions).toContain("passwords included");
}, 20_000);

test("start, mark and stop pass their arguments through", async () => {
  const { client, seen } = await connect((req) => {
    if (req.t === "observe.mark") return { queued: true };
    return {
      session: {
        ...status,
        reason: req.t === "observe.stop" ? "stopped" : undefined,
      },
    };
  });
  const started = await call(client, "observe_start", {
    seconds: 60,
    stop_key: "F8",
    goal: "one round",
    frame_ms: 0,
    frame_edge: 512,
  });
  expect(JSON.parse(started.content[0]!.text!).id).toBe(status.id);
  const marked = await call(client, "observe_mark", {
    kind: "success",
    label: "won",
    data: { score: 3 },
  });
  expect(marked.content[0]!.text).toBe("marked");
  const stopped = await call(client, "observe_stop");
  expect(JSON.parse(stopped.content[0]!.text!).reason).toBe("stopped");
  const strip = ({ id: _, ...rest }: Request) => rest;
  expect(seen.map(strip)).toEqual([
    {
      t: "observe.start",
      seconds: 60,
      stop_key: "F8",
      goal: "one round",
      frame_ms: 0,
      frame_edge: 512,
    },
    { t: "observe.mark", kind: "success", label: "won", data: { score: 3 } },
    { t: "observe.stop" },
  ]);
}, 20_000);

test("a mark with no recording running says so", async () => {
  const { client, seen } = await connect(() => ({ queued: false }));
  const r = await call(client, "observe_mark");
  expect(r.content[0]!.text).toContain("not marked");
  // kind defaults to mark
  expect(seen[0]!.kind).toBe("mark");
}, 20_000);

test("list and events read back, with the id sent as session", async () => {
  const { client, seen } = await connect((req) =>
    req.t === "observe.list"
      ? {
          recordings: [
            { id: status.id, owner: "desktop", owner_kind: "client" },
          ],
        }
      : { lines: [{ seq: 4, t: 120, kind: "down", key: "A" }], next: 5 },
  );
  const list = await call(client, "observe_list");
  expect(JSON.parse(list.content[0]!.text!)[0].owner).toBe("desktop");
  const events = await call(client, "observe_events", {
    id: status.id,
    from_seq: 4,
  });
  expect(JSON.parse(events.content[0]!.text!)).toEqual({
    lines: [{ seq: 4, t: 120, kind: "down", key: "A" }],
    next: 5,
  });
  // `id` on the wire is the correlation id, so the recording travels as
  // session; max_bytes defaults to 64 KB to keep the reply small
  expect(seen[1]).toMatchObject({
    t: "observe.events",
    session: status.id,
    from_seq: 4,
    max_bytes: 65536,
  });
  expect(seen[1]!.id).not.toBe(status.id);
}, 20_000);

test("a frame comes back as an image", async () => {
  const png = await sharp({
    create: {
      width: 64,
      height: 32,
      channels: 3,
      background: { r: 0, g: 0, b: 255 },
    },
  })
    .png()
    .toBuffer();
  const { client, seen } = await connect(() => ({
    mime: "image/png",
    width: 64,
    height: 32,
    data: png.toString("base64"),
  }));
  const r = await call(client, "observe_frame", {
    id: status.id,
    file: "frames/000001.png",
  });
  expect(r.content[0]!.text).toContain("frames/000001.png");
  const image = r.content[1]!;
  expect(image.type).toBe("image");
  expect(image.mimeType).toBe("image/webp");
  const meta = await sharp(Buffer.from(image.data!, "base64")).metadata();
  expect([meta.format, meta.width, meta.height]).toEqual(["webp", 64, 32]);
  expect(seen[0]).toMatchObject({
    t: "observe.frame",
    session: status.id,
    file: "frames/000001.png",
    max_edge: 1280,
  });
}, 20_000);

test("a refusal the user fixes is reported plainly", async () => {
  const codes = ["disabled", "unknown_command", "unavailable"];
  let n = 0;
  const { client } = await connect(() => ({
    error: { code: codes[n++]!, message: "refused" },
  }));
  const said = [];
  for (const _ of codes) {
    const r = await call(client, "observe_list");
    expect(r.isError).toBe(true);
    said.push(r.content[0]!.text!);
  }
  expect(said[0]).toContain("Allow observation is off");
  expect(said[1]).toContain("older than 0.5.0");
  expect(said[2]).toContain("older than 3.15.0");
}, 20_000);

test("any other error keeps Remote Control's message", async () => {
  const { client } = await connect(() => ({
    error: {
      code: "handler_error",
      message: "rb.observe.start: An observation is already running",
    },
  }));
  const r = await call(client, "observe_start");
  expect(r.isError).toBe(true);
  expect(r.content[0]!.text).toContain("An observation is already running");
}, 20_000);

test("observeRefusal answers only the codes the user fixes", () => {
  expect(observeRefusal(new ServerError("disabled", "x"))).toContain(
    "Allow observation",
  );
  expect(observeRefusal(new ServerError("handler_error", "x"))).toBeNull();
  expect(observeRefusal(new Error("disabled"))).toBeNull();
});
