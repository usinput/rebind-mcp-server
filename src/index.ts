#!/usr/bin/env bun

// stdio MCP server wrapping @rebind.gg/client-ts. all model-facing features
// live here: image pipeline, coordinate bookkeeping, verified click,
// calibration. the Rust/Lua layers below ship primitives only.
//
// config: REBIND_URL (default ws://127.0.0.1:19561), REBIND_TOKEN (optional).

import { appendFileSync } from "node:fs";
import { homedir } from "node:os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RebindRemote } from "@rebind.gg/client-ts";
import { z } from "zod";
import { renderScreenshot } from "./image.ts";
import { Session } from "./session.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function text(t: string) {
  return { content: [{ type: "text" as const, text: t }] };
}

async function main() {
  const url = process.env.REBIND_URL ?? "ws://127.0.0.1:19561";
  const client = new RebindRemote(url, {
    token: process.env.REBIND_TOKEN ?? "",
    timeoutMs: 15000,
  });

  // --selftest: verify the relay is reachable and capturing, then exit. Used by
  // the installer and by users to diagnose the #1 first-run failure (relay not
  // loaded) without wiring up the MCP transport.
  if (process.argv.includes("--selftest")) {
    try {
      await client.connect();
      const cap = await client.screenCapture({});
      console.error(
        `selftest OK: relay ${url}, display ${cap.display.index} ${cap.display.width}x${cap.display.height}`,
      );
      process.exit(0);
    } catch (e) {
      console.error(
        `selftest FAILED: Rebind relay not reachable on ${url}.\n` +
          `Start Rebind and load the Remote Access script (remote_access.lua).\n(${e})`,
      );
      process.exit(1);
    }
  }

  await client.connect();

  const session = new Session(client);
  try {
    await session.calibrate();
  } catch (e) {
    session.calibration = { calibrated: false, reason: String(e) };
  }

  const server = new McpServer({ name: "rebind", version: "0.1.1" });

  // REBIND_AGENT_LOG=<path>: opt-in telemetry — one JSONL line per tool call
  // ({ts, tool, ok, latency_ms, note}). No screenshot bytes, no user content.
  // No-op when unset.
  const telemetryPath = process.env.REBIND_AGENT_LOG?.replace(/^~(?=\/)/, homedir());
  const logCall = (tool: string, ok: boolean, t0: number, note?: string) => {
    if (!telemetryPath) return;
    try {
      appendFileSync(
        telemetryPath,
        `${JSON.stringify({ ts: new Date().toISOString(), tool, ok, latency_ms: Math.round(performance.now() - t0), ...(note ? { note } : {}) })}\n`,
      );
    } catch {
      // telemetry must never break a tool call
    }
  };
  const register = (name: string, config: object, handler: (args: any) => Promise<any>) => {
    server.registerTool(name, config as any, async (args: any) => {
      const t0 = performance.now();
      try {
        const result = await handler(args);
        logCall(name, true, t0);
        return result;
      } catch (e) {
        logCall(name, false, t0, String(e));
        throw e;
      }
    });
  };

  register(
    "screenshot",
    {
      description:
        "Capture a display and return it as an image. The cursor is marked with a red crosshair. " +
        "All click/move coordinates you emit must be pixel coordinates in the MOST RECENT screenshot. " +
        "After every action, take a new screenshot and verify the action had the intended effect before continuing; if not, correct and retry.",
      inputSchema: {
        display: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe(
            "1-based display index from list_displays; defaults to the display under the cursor",
          ),
      },
    },
    async ({ display }) => {
      const cap = await client.screenCapture({ display });
      const shot = await renderScreenshot({
        png: Buffer.from(cap.image, "base64"),
        logicalWidth: cap.display.width,
        logicalHeight: cap.display.height,
        cursor: {
          x: cap.cursor.x - cap.display.x,
          y: cap.cursor.y - cap.display.y,
        },
      });
      session.lastShot = {
        displayIndex: cap.display.index,
        originX: cap.display.x,
        originY: cap.display.y,
        scale: shot.scale,
        imageWidth: shot.width,
        imageHeight: shot.height,
      };
      const win = await client.systemWindow().catch(() => null);
      const lines = [
        `display ${cap.display.index}: ${cap.display.width}x${cap.display.height} at (${cap.display.x}, ${cap.display.y})${cap.display.primary ? " (primary)" : ""}`,
        `image: ${shot.width}x${shot.height} — emit click/move coordinates in this image's pixel space`,
        `cursor: image (${Math.round((cap.cursor.x - cap.display.x) * shot.scale)}, ${Math.round((cap.cursor.y - cap.display.y) * shot.scale)}), marked with a red crosshair`,
        win ? `active window: "${win.title}" (${win.process})` : null,
        session.calibration && !session.calibration.calibrated
          ? `WARNING: mouse not calibrated — ${session.calibration.reason}. Clicks may land off-target; verify each one.`
          : null,
      ].filter(Boolean);
      return {
        content: [
          { type: "text" as const, text: lines.join("\n") },
          {
            type: "image" as const,
            data: shot.data.toString("base64"),
            mimeType: "image/webp",
          },
        ],
      };
    },
  );

  register(
    "screenshot_window",
    {
      description:
        "Capture just ONE window (by title substring, or the active window if omitted) instead of a whole display — smaller, cheaper, and monitor-proof. " +
        "Click/move coordinates you emit map into THIS capture exactly like screenshot. Prefer this over a full-screen screenshot to read or verify a specific app.",
      inputSchema: {
        title: z
          .string()
          .optional()
          .describe("window title substring; omit to capture the active window"),
      },
    },
    async ({ title }) => {
      const win = title
        ? (await client.windowList(title))[0]
        : await client.systemWindow();
      if (!win) throw new Error(`no window matches "${title}"`);
      const cap = await client.screenCaptureWindow({ title: win.title });
      // remote.luau captures the window rect clamped to its display; recover the
      // capture's screen-space origin so image coords map back to the screen.
      const originX = Math.max(cap.display.x, win.x);
      const originY = Math.max(cap.display.y, win.y);
      const rx = Math.max(0, win.x - cap.display.x);
      const ry = Math.max(0, win.y - cap.display.y);
      const logicalWidth = Math.min(win.width, cap.display.width - rx);
      const logicalHeight = Math.min(win.height, cap.display.height - ry);
      const curInside =
        cap.cursor.x >= originX &&
        cap.cursor.x < originX + logicalWidth &&
        cap.cursor.y >= originY &&
        cap.cursor.y < originY + logicalHeight;
      const shot = await renderScreenshot({
        png: Buffer.from(cap.image, "base64"),
        logicalWidth,
        logicalHeight,
        cursor: curInside
          ? { x: cap.cursor.x - originX, y: cap.cursor.y - originY }
          : undefined,
      });
      session.lastShot = {
        displayIndex: cap.display.index,
        originX,
        originY,
        scale: shot.scale,
        imageWidth: shot.width,
        imageHeight: shot.height,
      };
      return {
        content: [
          {
            type: "text" as const,
            text: `window "${win.title}" at screen (${win.x}, ${win.y}), ${logicalWidth}x${logicalHeight} — emit click/move coords in this image's pixel space (${shot.width}x${shot.height})`,
          },
          {
            type: "image" as const,
            data: shot.data.toString("base64"),
            mimeType: "image/webp",
          },
        ],
      };
    },
  );

  register(
    "zoom",
    {
      description:
        "Capture a region of the last screenshot at full native resolution, for reading small text or inspecting small targets. " +
        "READ-ONLY: click coordinates still refer to the last full screenshot, not the zoomed image.",
      inputSchema: {
        x: z
          .number()
          .describe("region top-left x, in last-screenshot image pixels"),
        y: z
          .number()
          .describe("region top-left y, in last-screenshot image pixels"),
        w: z
          .number()
          .min(1)
          .describe("region width, in last-screenshot image pixels"),
        h: z
          .number()
          .min(1)
          .describe("region height, in last-screenshot image pixels"),
      },
    },
    async ({ x, y, w, h }) => {
      const shot = session.lastShot;
      if (!shot)
        throw new Error("no screenshot taken yet — call screenshot first");
      const topLeft = session.mapImagePoint(x, y);
      const cap = await client.screenCapture({
        display: shot.displayIndex,
        region: {
          x: topLeft.x - shot.originX,
          y: topLeft.y - shot.originY,
          w: Math.ceil(w / shot.scale),
          h: Math.ceil(h / shot.scale),
        },
      });
      const rendered = await renderScreenshot({
        png: Buffer.from(cap.image, "base64"),
        logicalWidth: Math.ceil(w / shot.scale),
        logicalHeight: Math.ceil(h / shot.scale),
      });
      return {
        content: [
          {
            type: "text" as const,
            text: `zoomed region (${x}, ${y}) ${w}x${h} of the last screenshot. Coordinates for clicks still refer to the last full screenshot.`,
          },
          {
            type: "image" as const,
            data: rendered.data.toString("base64"),
            mimeType: "image/webp",
          },
        ],
      };
    },
  );

  register(
    "list_displays",
    { description: "Enumerate displays with their virtual-desktop geometry." },
    async () => text(JSON.stringify(await client.screenDisplays(), null, 2)),
  );

  register(
    "click",
    {
      description:
        "Move the mouse to a point in the last screenshot and click. The landing position is verified and corrected before pressing. " +
        "Prefer keyboard shortcuts (the key tool) for fiddly widgets like address bars and dropdowns.",
      inputSchema: {
        x: z.number().describe("x in last-screenshot image pixels"),
        y: z.number().describe("y in last-screenshot image pixels"),
        button: z.enum(["left", "right", "middle"]).default("left"),
        double: z.boolean().default(false),
      },
    },
    async ({ x, y, button, double }) => {
      const target = session.mapImagePoint(x, y);
      const r = await session.verifiedClick(target.x, target.y, button, double);
      return text(
        r.ok
          ? `clicked ${button}${double ? " (double)" : ""} at screen (${r.landed.x}, ${r.landed.y})${r.corrected ? " after one correction" : ""}`
          : `WARNING: cursor landed at (${r.landed.x}, ${r.landed.y}) instead of (${target.x}, ${target.y}) — the click may have missed. Take a screenshot to verify.`,
      );
    },
  );

  register(
    "move_mouse",
    {
      description:
        "Move the mouse to a point in the last screenshot without clicking.",
      inputSchema: {
        x: z.number().describe("x in last-screenshot image pixels"),
        y: z.number().describe("y in last-screenshot image pixels"),
      },
    },
    async ({ x, y }) => {
      const target = session.mapImagePoint(x, y);
      const landed = await session.moveTo(target.x, target.y);
      return text(`cursor at screen (${landed.x}, ${landed.y})`);
    },
  );

  register(
    "type",
    {
      description: "Type text into the focused element via the keyboard.",
      inputSchema: { text: z.string() },
    },
    async ({ text: t }) => {
      client.hidType(t);
      // typing is paced by the relay; give it time proportional to length
      await sleep(Math.min(50 + t.length * 15, 5000));
      return text(`typed ${t.length} characters`);
    },
  );

  register(
    "key",
    {
      description:
        'Press a key or combo. Names: "Enter", "Escape", "Tab", "Backspace", arrows ("Up", "Down", "Left", "Right"), letters/digits, modifiers "LCtrl", "LAlt", "LShift", "LMeta". ' +
        'Combos join with "+", e.g. "LCtrl+L" (focus address bar), "LCtrl+C", "LAlt+Tab".',
      inputSchema: { combo: z.string() },
    },
    async ({ combo }) => {
      client.hidPress(combo, 30);
      await sleep(80);
      return text(`pressed ${combo}`);
    },
  );

  register(
    "scroll",
    {
      description:
        "Scroll the mouse wheel at the current cursor position. Positive = up, negative = down.",
      inputSchema: { clicks: z.number().int().describe("wheel clicks") },
    },
    async ({ clicks }) => {
      client.hidScroll(clicks);
      await sleep(80);
      return text(`scrolled ${clicks} clicks`);
    },
  );

  register(
    "list_windows",
    {
      description: "List open windows (handle, title, process, geometry).",
      inputSchema: {
        filter: z.string().optional().describe("title substring filter"),
      },
    },
    async ({ filter }) =>
      text(JSON.stringify(await client.windowList(filter), null, 2)),
  );

  register(
    "focus_window",
    {
      description:
        "Bring a window to the foreground by handle (from list_windows).",
      inputSchema: { handle: z.number() },
    },
    async ({ handle }) => {
      await client.windowActivate(handle);
      return text(`activated window ${handle}`);
    },
  );

  register(
    "wait",
    {
      description: "Pause before the next action (page loads, animations).",
      inputSchema: { ms: z.number().int().min(1).max(10000) },
    },
    async ({ ms }) => {
      await sleep(ms);
      return text(`waited ${ms}ms`);
    },
  );

  register(
    "get_cursor",
    { description: "Read the current cursor position in screen coordinates." },
    async () => text(JSON.stringify(await client.systemMouse())),
  );

  register(
    "active_window",
    { description: "Read the currently focused window." },
    async () => text(JSON.stringify(await client.systemWindow())),
  );

  register(
    "calibrate",
    {
      description:
        "Re-run the mouse scale probe (auto-runs at startup). Verifies relative mouse counts map 1:1 to pixels; reports pointer-ballistics misconfiguration.",
    },
    async () => text(JSON.stringify(await session.calibrate())),
  );

  register(
    "run_lua",
    {
      description:
        "Run a Luau script on the connected machine through Rebind's engine and return its `return` value as JSON. " +
        "PREFER THIS over the screenshot→click loop for any DETERMINISTIC sequence — it is far faster, cheaper, and " +
        "reliable, and it sidesteps multi-monitor guessing. Use it to: launch apps (`System.ExecDetached(\"cmd\", {\"/c\",\"start\",\"\",url})`), " +
        "wait for and place windows on a known display (`local h=Window.Wait(title, ms); Window.Move(h, x, y, w, h)`), " +
        "run shell commands (`System.Exec(cmd) -> {exit,stdout,stderr}`), find UI by color (`Screen.SearchForColor(region,hex)`), " +
        "type, click, read pixels, manage processes. Namespaces: System, HID, Input, Screen, Window, Process, File, Clipboard, Net, Macro, Env, Log. " +
        "Fall back to `screenshot` only for genuinely visual reasoning the script cannot resolve. End the script with `return <value>` to get data back.",
      inputSchema: {
        source: z
          .string()
          .describe("Luau source. End with `return <value>` to return data."),
      },
    },
    async ({ source }) => {
      const result = await client.luaExec(source);
      return text(
        typeof result === "string" ? result : JSON.stringify(result, null, 2),
      );
    },
  );

  await server.connect(new StdioServerTransport());
  // stdout carries the MCP protocol — log to stderr only
  console.error(
    `rebind-mcp-server: connected to ${url} (calibrated=${session.calibration?.calibrated ?? false})`,
  );
}

main().catch((e) => {
  console.error(`rebind-mcp-server: fatal: ${e}`);
  process.exit(1);
});
