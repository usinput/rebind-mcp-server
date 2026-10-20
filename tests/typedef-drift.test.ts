import { expect, test } from "bun:test";
import { readdirSync } from "node:fs";

const typedefUrl = new URL(
  "../../lua-sdk/types/rebind.d.luau",
  import.meta.url,
);
const sourceUrl = new URL("../../lua-sdk/src/", import.meta.url);
const repoRoot = new URL("../../../", import.meta.url).pathname;

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

/** The `declare rb` block: its depth-1 names, `module.member` for every
 *  member of a table-typed name, and the names that are callable tables. */
function rbSurface(source: string): {
  top: Set<string>;
  members: Set<string>;
  callable: Set<string>;
} {
  const open = source.indexOf("{", source.indexOf("declare rb:"));
  const top = new Set<string>();
  const members = new Set<string>();
  const callable = new Set<string>();
  const stack: string[] = [];
  let current = "";
  for (const line of braceBody(source, open).split("\n")) {
    const code = line.replace(/--.*/, "");
    for (const m of code.matchAll(/([A-Za-z_]\w*)\s*:(?!:)|[{([]|[})\]]/g)) {
      const name = m[1];
      if (!name) {
        if ("{([".includes(m[0])) stack.push(m[0]);
        else stack.pop();
      } else if (stack.length === 0) {
        current = name;
        top.add(name);
      } else if (name === "__call") {
        callable.add(current);
      } else if (
        stack.at(-1) === "{" &&
        !stack.slice(stack.indexOf("{")).includes("(")
      ) {
        // a member, not a parameter or a field of an inline option table
        members.add(`${current}.${name}`);
      }
    }
  }
  return { top, members, callable };
}

/** the string members of an `export type Name = { ... }` */
function typeFields(source: string, name: string): Set<string> {
  const at = source.indexOf(`export type ${name} = {`);
  if (at < 0) throw new Error(`export type ${name} not found`);
  const body = braceBody(source, source.indexOf("{", at));
  return new Set(
    [...body.matchAll(/^\s*([A-Za-z_]\w*)\s*:/gm)].map((m) => m[1]!),
  );
}

async function allHooks(): Promise<string[]> {
  const validate = await Bun.file(new URL("validate.rs", sourceUrl)).text();
  return (
    validate
      .match(/pub const ALL_HOOKS:[\s\S]*?\];/)?.[0]
      .match(/"(On\w+)"/g)
      ?.map((s) => s.slice(1, -1)) || []
  );
}

/** `OnInputDown` -> `input_down`, the rule rb.on uses */
const eventName = (hook: string) =>
  hook
    .slice(2)
    .replace(/(?<!^)([A-Z])/g, "_$1")
    .toLowerCase();

/** the `export type Event` names, each with its argument comment */
function events(source: string): { name: string; documented: boolean }[] {
  const at = source.indexOf("export type Event =");
  const block = source.slice(at, source.indexOf("\n\n", at));
  return [...block.matchAll(/^\s*\|\s*"(\w+)"(.*)$/gm)].map((m) => ({
    name: m[1]!,
    documented: /^\s*--\s*\(/.test(m[2]!),
  }));
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
  const contract = new Set(await allHooks());
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

test("typedef rb block matches the rb prelude", async () => {
  const typedefs = await Bun.file(typedefUrl).text();
  const golden = await Bun.file(new URL("rb.rs", sourceUrl)).text();
  const prelude = await Bun.file(new URL("rb.luau", sourceUrl)).text();
  const goldenTable = golden.match(/const GOLDEN:[\s\S]*?\];/)?.[0] ?? "";
  const expectedMembers = [
    ...goldenTable.matchAll(/\("([a-z0-9_]+\.[a-z0-9_]+)", "\w+\.\w+"\)/g),
  ].map((m) => m[1]!);
  const namespaces =
    prelude
      .match(/local NAMESPACES = \{([\s\S]*?)\}/)?.[1]
      ?.match(/"(\w+)"/g)
      ?.map((s) => s.slice(1, -1).toLowerCase()) ?? [];
  const assigned = [...prelude.matchAll(/\brb\.(\w+)\s*=(?!=)/g)].map(
    (m) => m[1]!,
  );
  expect(expectedMembers.length).toBeGreaterThan(100);
  expect(namespaces.length).toBeGreaterThan(20);

  const declared = rbSurface(typedefs);
  expect([...declared.members].sort()).toEqual([...expectedMembers].sort());
  expect([...declared.top].sort()).toEqual(
    [...new Set([...namespaces, ...assigned])].sort(),
  );
  expect([...declared.callable]).toEqual(["bind"]);

  const declaredEvents = events(typedefs);
  expect(declaredEvents.map((e) => e.name)).toEqual(
    (await allHooks()).map(eventName),
  );
  expect(declaredEvents.filter((e) => !e.documented)).toEqual([]);

  // the rb block sits between the types and the v1 names, and must not hold
  // the markers the v1 surface parser slices on
  const rb = typedefs.indexOf("\n-- rb\n");
  const v1 = typedefs.indexOf("\n-- v1 names\n");
  expect(rb).toBeGreaterThan(typedefs.lastIndexOf("\nexport type "));
  expect(v1).toBeGreaterThan(rb);
  const block = typedefs.slice(rb, v1);
  expect(block).not.toContain("declare Bind:");
  expect(block).not.toContain("-- timer namespace");
});

test("SDK reference mentions every public callable", async () => {
  const typedefs = await Bun.file(typedefUrl).text();
  const docs = await Bun.file(
    new URL(
      "../../../www/docs-v2/reference/sdk-reference.mdx",
      import.meta.url,
    ),
  ).text();
  const { top, members, callable } = rbSurface(typedefs);
  const mentions = (pattern: string) =>
    new RegExp(`(^|[^A-Za-z0-9_.])${pattern}(?=\\W|$)`, "m").test(docs);
  const literal = (name: string) => name.replaceAll(".", "\\.");
  // a member may be written module-qualified (hid.down) or in full (rb.hid.down)
  const missingMembers = [...members].filter(
    (member) => !mentions(`(rb\\.)?${literal(member)}`),
  );
  // a name that is not a module of members is written in full: rb.run
  const plain = [...top]
    .filter(
      (name) =>
        callable.has(name) ||
        ![...members].some((member) => member.startsWith(`${name}.`)),
    )
    .map((name) => `rb.${name}`);
  // globals with no rb counterpart, such as require
  const globals = [...typedefs.matchAll(/^declare function (\w+)\(/gm)]
    .map((match) => match[1]!)
    .filter((name) => !top.has(name.toLowerCase()));
  const missing = [
    ...missingMembers.map((member) => `rb.${member}`),
    ...[...plain, ...globals].filter((name) => !mentions(literal(name))),
  ].sort();
  expect(missing).toEqual([]);
  expect(docs).not.toMatch(/^\|[^|\n]+\|\s*\{/m);
});

// The teaching surfaces write rb. v1-names.mdx is the one page that shows the
// v1 names, as the mapping from them.
const GATE_EXEMPT = new Set(["www/docs-v2/reference/v1-names.mdx"]);

async function teachingCode(): Promise<
  { path: string; line: number; code: string }[]
> {
  const scan = (pattern: string) => [
    ...new Bun.Glob(pattern).scanSync({ cwd: repoRoot }),
  ];
  const fenced = [
    ...scan("www/docs-v2/**/*.mdx"),
    "docs/REBIND-AGENT-PRE-PROMPT.md",
    ...scan("apps/api-v2/prompts/*.md"),
  ];
  const whole = [
    ...scan("packages/lua-sdk/examples/*.lua"),
    ...scan("apps/relay/src/default_scripts/*.luau"),
  ];
  const out: { path: string; line: number; code: string }[] = [];
  for (const path of whole.sort()) {
    out.push({ path, line: 1, code: await Bun.file(repoRoot + path).text() });
  }
  for (const path of fenced.sort()) {
    if (GATE_EXEMPT.has(path)) continue;
    const lines = (await Bun.file(repoRoot + path).text()).split("\n");
    for (let i = 0; i < lines.length; i++) {
      const info = lines[i]!.match(/^\s*```(\S*)/)?.[1];
      if (info === undefined) continue;
      let end = i + 1;
      while (end < lines.length && !/^\s*```\s*$/.test(lines[end]!)) end++;
      if (info === "lua" || info === "luau")
        out.push({
          path,
          line: i + 2,
          code: lines.slice(i + 1, end).join("\n"),
        });
      i = end;
    }
  }
  return out;
}

/** A checker for teaching code: the offset and reason of every v1 name it
 *  uses, and of every rb name the typedef does not declare. */
async function gate(): Promise<(code: string) => [number, string][]> {
  const typedefs = await Bun.file(typedefUrl).text();
  const { top, members } = rbSurface(typedefs);
  // an rb member typed by a named table (ai: RbAi) has that type's fields
  for (const [, name, type] of typedefs.matchAll(
    /^ {2}(\w+): (Rb[A-Z]\w*),$/gm,
  ))
    for (const field of typeFields(typedefs, type!))
      members.add(`${name}.${field}`);
  const info = typeFields(typedefs, "RebindInfo");
  const eventNames = new Set(events(typedefs).map((e) => e.name));
  const namespaces = new Set(
    [...typedefSurface(typedefs).symbols].map(
      (symbol) => symbol.split(".")[0]!,
    ),
  );
  const hooks = await allHooks();
  const refused: [string, RegExp][] = [
    [
      "v1 namespace",
      new RegExp(`(?<![\\w.])(${[...namespaces].join("|")})\\.[A-Z]\\w*`, "g"),
    ],
    ["v1 global", /(?<![\w.:])(Run|Sleep|After|Async)\s*\(/g],
    ["v1 global", /\b_REBIND\b/g],
    ["v1 handle verb", /:[A-Z]\w*\(/g],
    ["v1 hook", new RegExp(`\\bfunction\\s+(${hooks.join("|")})\\s*\\(`, "g")],
    ["v1 Bind", /(?<![\w.])Bind\s*[(.]/g],
  ];
  return (code) => {
    const problems: [number, string][] = [];
    for (const [what, pattern] of refused) {
      for (const m of code.matchAll(pattern))
        problems.push([m.index, `${what}: ${m[0]}`]);
    }
    for (const m of code.matchAll(
      /(?<![\w.:])rb\.([A-Za-z_]\w*)(?:\.([A-Za-z_]\w*))?/g,
    )) {
      const name = m[1]!;
      const field = m[2];
      const known =
        top.has(name) &&
        (field === undefined ||
          (name === "info"
            ? info.has(field)
            : members.has(`${name}.${field}`)));
      if (!known) problems.push([m.index, `undeclared: ${m[0]}`]);
    }
    for (const m of code.matchAll(/(?<![\w.:])rb\.on\(\s*["'](\w+)["']/g)) {
      if (!eventNames.has(m[1]!))
        problems.push([m.index, `unknown event: ${m[1]}`]);
    }
    return problems.sort((a, b) => a[0] - b[0]);
  };
}

test("the teaching gate passes rb and refuses v1 names", async () => {
  const check = await gate();
  const reasons = (code: string) => check(code).map(([, reason]) => reason);
  expect(
    reasons(`
      local cfg = rb.ui.schema({ enabled = rb.ui.toggle(true) })
      local line = string.format("%s on %s", rb.info.name, rb.info.platform)
      local list = {}
      table.insert(list, math.floor(rb.input.mouse_pos().x))
      local h = rb.bind("F8", function() rb.hid.combo("lctrl+c") end, { swallow = false })
      local t = rb.timer.every(100, function() if cfg.enabled then h:stop() end end)
      rb.bind.toggle("F9", "enabled")
      rb.on("input_down", function(key) rb.log.info(key, ("x"):upper()) end)
      rb.run(function() rb.sleep(10) t:is_running() end)
    `),
  ).toEqual([]);
  expect(
    reasons(`
      function OnDown(key) HID.Down(key) end
      Bind("F8", function() return true end)
      Run(function() Sleep(10) end)
      local h = Timer.After(1, f) h:Cancel()
      rb.hid.Down("A") rb.info.nope() rb.nope() rb.on("OnDown", f)
      print(_REBIND.name)
    `),
  ).toEqual([
    "v1 hook: function OnDown(",
    "v1 namespace: HID.Down",
    "v1 Bind: Bind(",
    "v1 global: Run(",
    "v1 global: Sleep(",
    "v1 namespace: Timer.After",
    "v1 handle verb: :Cancel(",
    "undeclared: rb.hid.Down",
    "undeclared: rb.info.nope",
    "undeclared: rb.nope",
    "unknown event: OnDown",
    "v1 global: _REBIND",
  ]);
});

test("teaching surfaces write rb names that exist", async () => {
  const check = await gate();
  const problems: string[] = [];
  for (const { path, line, code } of await teachingCode()) {
    for (const [index, reason] of check(code)) {
      const at = line + code.slice(0, index).split("\n").length - 1;
      problems.push(`${path}:${at} ${reason}`);
    }
  }
  expect(problems).toEqual([]);
});
