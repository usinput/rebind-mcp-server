// Shared key-combo normalization for every surface that sends model-authored
// chords to the relay (the MCP server's `key` tool and the bench executor).
//
// Models emit "LCmd"/"Cmd"/"Command"/"⌘" for the macOS Command key, but the SDK
// key parser only knows LMeta/Meta/Cmd (not the L-prefixed "LCmd"). Without
// normalization the modifier is silently dropped and the bare letter types.

const META = new Set([
  "LCMD",
  "CMD",
  "COMMAND",
  "⌘",
  "LMETA",
  "META",
  "SUPER",
  "LWIN",
  "WIN",
]);
const RMETA = new Set(["RCMD", "RCOMMAND", "RMETA", "RWIN"]);

export function normalizeCombo(combo: string): string {
  return combo
    .split("+")
    .map((t) => {
      const u = t.trim().toUpperCase();
      if (META.has(u)) return "LMeta";
      if (RMETA.has(u)) return "RMeta";
      return t.trim();
    })
    .join("+");
}
