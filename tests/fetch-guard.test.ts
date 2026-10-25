import { expect, test } from "bun:test";
import { isSafeFetchUrl } from "../src/fetch-guard.ts";

test("public names and addresses pass", () => {
  for (const url of [
    "https://fdic.gov/",
    "https://fcbarcelona.com/",
    "https://docs.rebind.gg/llms.txt",
    "http://8.8.8.8/",
    "http://192.0.78.9/",
    "https://example.com./path?q=1",
  ])
    expect(isSafeFetchUrl(url)).toBe(true);
});

test("curl globs, quotes and bracketed IPv6 never pass", () => {
  for (const url of [
    "http://{127.0.0.1,x.invalid}/",
    "http://example.com/{a,b}",
    "http://[::1]/",
    "http://[fe80::1]/",
    "http://[::ffff:7f00:1]/",
    "http://example.com/'$(id)'",
    "ftp://example.com/",
  ])
    expect(isSafeFetchUrl(url)).toBe(false);
});

test("loopback, private, reserved and local names are refused", () => {
  for (const url of [
    "http://127.0.0.1/",
    "http://127.1/",
    "http://0x7f.0.0.1/",
    "http://2130706433/",
    "http://0.1.2.3/",
    "http://10.0.0.1/",
    "http://100.64.0.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://172.20.0.1/",
    "http://192.168.1.1/",
    "http://198.18.0.1/",
    "http://224.0.0.1/",
    "http://localhost/",
    "http://LOCALHOST./",
    "http://api.localhost/",
    "http://printer.local/",
    "http://metadata.google.internal/",
    "http://nas.home.arpa/",
    "http://router/",
  ])
    expect(isSafeFetchUrl(url)).toBe(false);
});
