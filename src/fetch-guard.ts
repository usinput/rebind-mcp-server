// The meditate tool's check on model- and page-chosen URLs before they reach
// relay-side curl (spliced into a shell command inside Lua long-bracket
// quoting) or the user's browser.

import { isIP } from "node:net";

/** plain http(s), with nothing that could leave the shell or Lua quoting or
 *  that curl reads as a glob ([] and {}); bracketed IPv6 literals stop here */
const SAFE_URL = /^https?:\/\/[^\s"'`\\\][{}]+$/;

// IPv4 ranges that are not public, as [base address, prefix length]
const RESERVED_V4: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3], // multicast and reserved, through 255.255.255.255
];

const toInt = (ip: string) =>
  ip.split(".").reduce((n, octet) => n * 256 + Number(octet), 0);
const inRange = (ip: string, [base, bits]: [string, number]) =>
  Math.floor(toInt(ip) / 2 ** (32 - bits)) ===
  Math.floor(toInt(base) / 2 ** (32 - bits));

// names that resolve to this machine, the LAN, or a cloud metadata service
const PRIVATE_NAME = /(^|\.)(localhost|local|internal|home\.arpa)$/;

/** Whether a URL may be fetched or opened for the user. Names are checked as
 *  written, not resolved, so a public name that points at a private address
 *  (127.0.0.1.nip.io, DNS rebinding) still passes, and the browser follows
 *  redirects before the landed URL is checked. Relay-side curl runs without
 *  -L, so its redirects are not followed. */
export function isSafeFetchUrl(u: string): boolean {
  if (!SAFE_URL.test(u)) return false;
  let host: string;
  try {
    host = new URL(u).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (host.endsWith(".")) host = host.slice(0, -1);
  // the URL parser has already turned 127.1, 0x7f.0.0.1 and 2130706433
  // into dotted decimal
  if (isIP(host) === 4) return !RESERVED_V4.some((r) => inRange(host, r));
  return host.includes(".") && !PRIVATE_NAME.test(host);
}
