// integration against the client-ts mock server: the mock applies hid.move /
// hid.move_to to an internal cursor and reads it back via system.mouse, so
// verified click and calibration exercise their real control flow.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { RebindRemote } from "@rebind.gg/client-ts";
import {
  createMockServer,
  type MockServer,
} from "../../client-ts/tests/helpers/mock-server.ts";
import { Session } from "../src/session.ts";

let server: MockServer;
let client: RebindRemote;
let session: Session;

beforeEach(async () => {
  server = createMockServer();
  client = new RebindRemote(server.url, { autoReconnect: false });
  await client.connect();
  session = new Session(client);
});

afterEach(async () => {
  client.close();
  await server.stop();
});

describe("verifiedClick", () => {
  test("lands exactly and reports ok without correction", async () => {
    const r = await session.verifiedClick(640, 360);
    expect(r.ok).toBe(true);
    expect(r.corrected).toBe(false);
    expect(r.landed).toEqual({ x: 640, y: 360 });
  });
});

describe("mapImagePoint", () => {
  test("throws before any screenshot", () => {
    expect(() => session.mapImagePoint(10, 10)).toThrow(/no screenshot/);
  });

  test("maps through the recorded shot and rejects out-of-bounds", () => {
    session.lastShot = {
      displayIndex: 1,
      originX: 100,
      originY: 50,
      scale: 0.5,
      imageWidth: 960,
      imageHeight: 540,
    };
    expect(session.mapImagePoint(480, 270)).toEqual({ x: 1060, y: 590 });
    expect(() => session.mapImagePoint(960, 0)).toThrow(/outside/);
  });
});

describe("calibrate", () => {
  test("mock moves are exact: calibrated with k around 1", async () => {
    const r = await session.calibrate();
    expect(r.calibrated).toBe(true);
    expect(r.k).toBeCloseTo(1);
  });

  test("restores the saved cursor position", async () => {
    const before = await client.systemMouse();
    await session.calibrate();
    // hid.move_to restore is fire-and-forget; poll the mock briefly
    await new Promise((r) => setTimeout(r, 50));
    expect(await client.systemMouse()).toEqual(before);
  });
});
