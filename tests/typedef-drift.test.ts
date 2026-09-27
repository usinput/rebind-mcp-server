import { expect, test } from "bun:test";
import { readdirSync } from "node:fs";

const typedefUrl = new URL(
  "../../lua-sdk/types/rebind.d.luau",
  import.meta.url,
);
const sourceUrl = new URL("../../lua-sdk/src/", import.meta.url);

function braceBody(source: string, open: number): string {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] !== "}") continue;
    if (--depth === 0) return source.slice(open + 1, i);
  }
  throw new Error("unclosed typedef body");
}

function typedefSurface(source: string): {
  symbols: Set<string>;
  duplicates: string[];
} {
  const symbols = new Set<string>();
  const duplicates: string[] = [];
  for (const match of source.matchAll(/declare ([A-Z][A-Za-z0-9]*):[^{]*\{/g)) {
    const namespace = match[1]!;
    const open = source.indexOf("{", match.index);
    const body = braceBody(source, open);
    let depth = 0;
    for (const line of body.split("\n")) {
      const member =
        depth === 0 ? line.match(/^\s*([A-Z][A-Za-z0-9]*):/)?.[1] : undefined;
      if (member) {
        const symbol = `${namespace}.${member}`;
        if (symbols.has(symbol)) duplicates.push(symbol);
        symbols.add(symbol);
      }
      for (const char of line.replace(/--.*/, "")) {
        if ("{([".includes(char)) depth++;
        if ("})]".includes(char)) depth--;
      }
    }
  }
  const bind = source.slice(
    source.indexOf("declare Bind:"),
    source.indexOf("-- timer namespace"),
  );
  for (const match of bind.matchAll(/^\s*([A-Z][A-Za-z0-9]*):/gm)) {
    const symbol = `Bind.${match[1]}`;
    if (symbols.has(symbol)) duplicates.push(symbol);
    symbols.add(symbol);
  }
  return { symbols, duplicates };
}

function tableMethods(source: string, variable: string): string[] {
  return [
    ...source.matchAll(
      new RegExp(`\\b${variable}\\.set\\(\\s*"([A-Z][A-Za-z0-9]*)"`, "g"),
    ),
  ].map((match) => match[1]!);
}

async function runtimeSurface(): Promise<Set<string>> {
  const sources: string[] = [];
  const nsDir = new URL("namespaces/", sourceUrl);
  for (const file of readdirSync(nsDir)) {
    if (file.endsWith(".rs"))
      sources.push(await Bun.file(new URL(file, nsDir)).text());
  }
  sources.push(await Bun.file(new URL("coroutines.rs", sourceUrl)).text());
  const lib = await Bun.file(new URL("lib.rs", sourceUrl)).text();
  sources.push(lib);

  const symbols = new Set<string>();
  for (const source of sources) {
    const tables = new Map<string, string>();
    for (const match of source.matchAll(
      /(?:lua\.globals\(\)|globals)\.(?:set|get)\(\s*"([A-Z][A-Za-z0-9]*)"\s*,?\s*([a-z_][A-Za-z0-9_]*)?/g,
    )) {
      const variable =
        match[2] ||
        source
          .slice(0, match.index)
          .match(/let\s+([a-z_][A-Za-z0-9_]*)[^;=]*=\s*$/)?.[1];
      if (variable) tables.set(variable, match[1]!);
    }
    for (const [variable, namespace] of tables) {
      for (const method of tableMethods(source, variable))
        symbols.add(`${namespace}.${method}`);
    }
    for (const match of source.matchAll(
      /function\s+([A-Z][A-Za-z0-9]*)\.([A-Z][A-Za-z0-9]*)\s*\(|\b([A-Z][A-Za-z0-9]*)\.([A-Z][A-Za-z0-9]*)\s*=\s*(?!nil\b)/g,
    )) {
      symbols.add(`${match[1] || match[3]}.${match[2] || match[4]}`);
    }
  }

  const systemStart = lib.indexOf("fn build_system_table(");
  const systemEnd = lib.indexOf("\n    Ok(t)\n", systemStart);
  if (systemStart < 0 || systemEnd < 0)
    throw new Error("build_system_table shape changed");
  const system = lib.slice(systemStart, systemEnd);
  for (const method of tableMethods(system, "t"))
    symbols.add(`System.${method}`);
  const internals = [
    [
      "Screen.SearchForColorSync",
      "Screen.SearchForColorSync, Screen.SearchForColorStart = nil",
    ],
    [
      "Screen.SearchForColorStart",
      "Screen.SearchForColorSync, Screen.SearchForColorStart = nil",
    ],
    ["Screen.CaptureSync", "Screen.CaptureSync, Screen.CaptureStart = nil"],
    ["Screen.CaptureStart", "Screen.CaptureSync, Screen.CaptureStart = nil"],
    [
      "Screen.FindImageSync",
      "Screen.FindImageSync, Screen.FindImageStart = nil",
    ],
    [
      "Screen.FindImageStart",
      "Screen.FindImageSync, Screen.FindImageStart = nil",
    ],
    ["System.__ExecSync", "System.__ExecSync, System.__ExecStart = nil"],
    ["System.__ExecStart", "System.__ExecSync, System.__ExecStart = nil"],
  ] as const;
  const allSources = sources.join("\n");
  for (const [internal, removal] of internals) {
    if (!allSources.includes(removal))
      throw new Error(
        `${internal} is registered internally but no longer removed by its public router`,
      );
    symbols.delete(internal);
  }
  return symbols;
}

test("typedef namespace surface matches registered public methods", async () => {
  const typedefs = await Bun.file(typedefUrl).text();
  const declared = typedefSurface(typedefs);
  const registered = await runtimeSurface();
  expect(declared.duplicates).toEqual([]);
  expect(
    [...registered].filter((symbol) => !declared.symbols.has(symbol)).sort(),
  ).toEqual([]);
  expect(
    [...declared.symbols].filter((symbol) => !registered.has(symbol)).sort(),
  ).toEqual([]);
});

test("typedef hooks match the validator contract", async () => {
  const typedefs = await Bun.file(typedefUrl).text();
  const validate = await Bun.file(new URL("validate.rs", sourceUrl)).text();
  const contract = new Set(
    validate
      .match(/pub const ALL_HOOKS:[\s\S]*?\];/)?.[0]
      .match(/"(On\w+)"/g)
      ?.map((s) => s.slice(1, -1)) || [],
  );
  const declared = new Set(
    [...typedefs.matchAll(/--\s*declare function (On\w+)\(/g)].map(
      (m) => m[1]!,
    ),
  );
  expect([...contract].filter((hook) => !declared.has(hook)).sort()).toEqual(
    [],
  );
  expect([...declared].filter((hook) => !contract.has(hook)).sort()).toEqual(
    [],
  );
});

test("SDK reference mentions every public callable", async () => {
  const typedefs = await Bun.file(typedefUrl).text();
  const docs = await Bun.file(
    new URL(
      "../../../www/docs-v2/reference/sdk-reference.mdx",
      import.meta.url,
    ),
  ).text();
  const globals = [
    ...typedefs.matchAll(/^declare function ((?!On)\w+)\(/gm),
  ].map((match) => match[1]!);
  const callables = [...typedefSurface(typedefs).symbols, ...globals];
  const missing = callables
    .filter(
      (symbol) =>
        !new RegExp(
          `(^|[^A-Za-z0-9_.])${symbol.replace(".", "\\.")}(?=\\W|$)`,
          "m",
        ).test(docs),
    )
    .sort();
  expect(missing).toEqual([]);
});
