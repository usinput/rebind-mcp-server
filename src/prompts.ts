// Canonical agent-facing copy, shared by the Rebind MCP server (this package)
// and the agent bench (packages/mcp-server/bench). ONE source of truth for the tool
// descriptions, efficiency doctrine, and machine-probe commands that both
// surfaces show the model, so they can never drift.
//
// PURE strings + string builders — ZERO runtime imports. That is deliberate:
// the colocated bench (../bench) imports this by relative path and must NOT pull
// in the MCP SDK, image pipeline, or calibration that live elsewhere in src/.
//
// What is NOT here, by design: the screenshot/click descriptions. The server's
// click is verified + calibrated; the bench's is a primitive hidMoveTo+press.
// A shared description would make one of them lie, so each keeps its own.

export type OS = "macOS" | "Linux" | "Windows";

// --- machine probes (run relay-side through System.Exec) ---

/** CLIs worth surfacing to the model; prints the ones present, space-separated. */
export const PROBE_CLIS_CMD = `for c in python3 osascript jq curl sed awk sort uniq grep wc open unzip tar; do command -v $c >/dev/null 2>&1 && printf "%s " $c; done`;

/** List up to 40 installed GUI apps, comma-separated, for the given OS. */
export function probeAppsCmd(os: OS): string {
  return os === "macOS"
    ? `ls /Applications /System/Applications 2>/dev/null | grep '\\.app$' | sed 's/\\.app$//' | sort -u | head -40 | tr '\\n' ','`
    : `ls /usr/share/applications 2>/dev/null | sed 's/\\.desktop$//' | sort -u | head -40 | tr '\\n' ','`;
}

/** How to launch a GUI app by name via run_lua, per OS. */
export function openAppHow(os: OS): string {
  if (os === "macOS") return 'System.ExecDetached("open", {"-a", "<Name>"})';
  if (os === "Linux") return 'System.ExecDetached("<name>", {})';
  return 'System.ExecDetached("cmd", {"/c","start","","<name>"})';
}

/** The shortcut modifier per OS — the #1 fix for wrong-key shortcut failures.
 * Returned as a fragment the caller wraps ("...shortcuts use <this>."). */
export function modifierNote(os: OS): string {
  return os === "macOS"
    ? "LMeta (Command): LMeta+A select all, LMeta+C copy, LMeta+V paste, LMeta+L focus the browser address bar"
    : "LCtrl: LCtrl+A select all, LCtrl+C copy, LCtrl+V paste, LCtrl+L focus the address bar";
}

// --- efficiency doctrine ---

/** Tool-preference ladder. run_lua only appears when the surface/arm has it. */
export function toolPriority(hasLua: boolean): string {
  return `Tool priority, most to least preferred: ${hasLua ? "script (run_lua) > " : ""}keyboard > mouse > screenshot. If an application accepts keyboard input for the job — typed digits and operators, shortcuts, menu accelerators, type-to-select — use the keyboard: it is deterministic and needs no coordinates. Use the mouse only when no keyboard path exists, and screenshots only when you genuinely need to see state.`;
}

export const BATCHING_DOCTRINE =
  "When you must drive the GUI: do not verify after every action. Batch predictable action sequences — keystrokes especially — and verify once at the end via values (file contents, clipboard, command output) rather than screenshots.";

/** GUI traps that reliably strand an agent, per OS. Returned as one line or "". */
export function guiTips(os: OS): string {
  if (os === "macOS")
    return (
      "GUI traps to avoid on macOS: (1) In Finder, Return/Enter RENAMES the selected item — it does NOT open it; open it with a DOUBLE-CLICK, or LMeta+O, or LMeta+Down. " +
      '(2) To open a URL, file, or app, prefer run_lua `System.ExecDetached("open", {"<url-or-path>"})` (or `{"-a","<App>"}`) over clicking the app\'s chrome — it is one call and cannot get lost. ' +
      "(3) If an unexpected window or dialog blocks you, handle it before continuing — never loop on it: dismiss a dialog with Escape, cycle between windows of the front app with LMeta+Grave (backtick), and close an unwanted window or tab with LMeta+W. " +
      '(4) To READ the current web page without a screenshot, script the browser: `local app = App.Front().name` (App.Front returns a table — use .name), then run_lua `System.Exec([[osascript -e \'tell application "<Name>" to get title of active tab of front window\']])` for the page title (swap `title` for `URL` to read the address). The tab title IS the page\'s heading for reporting purposes — report it as-is; do NOT try AppleScript `execute javascript` to scrape the DOM, it is disabled by default in every browser and the quoting will eat your remaining steps. For full page CONTENT (lists, articles, multiple pages), fetch the URL directly instead: `System.Exec("curl -s <url>")` and parse the HTML. ' +
      "(5) To DRIVE a web form (fill fields, click submit) you must work by SIGHT — call position_window on the browser FIRST so the whole form is visible and click coordinates are stable, then: screenshot, click a field, type its value, and after the last field click the submit button; screenshot to confirm each step landed. Do NOT use osascript `execute javascript` to fill or submit forms — it is disabled by default in browsers and the nested shell quoting fails."
    );
  return (
    "GUI traps: to open a URL/file/app, prefer run_lua `System.ExecDetached` over clicking the app's UI. Open a file by double-clicking it. " +
    "If an unexpected window/dialog blocks you, dismiss it (Escape) or close it (LCtrl+W) before continuing — never loop on it."
  );
}

export const DETERMINISTIC_WORK_DOCTRINE =
  "run_lua is your PRIMARY tool — reach for it FIRST and use it aggressively. It exposes the ENTIRE machine SDK (every namespace below), so almost anything a task needs — file operations, text processing, arithmetic, clipboard, launching and positioning apps, shell commands, reading the screen — is ONE run_lua call, never a click loop. Do not operate calculators, browsers, or file managers through the GUI when a script can do the work. Fall back to screenshot/click ONLY for state that exists purely on screen and cannot be scripted.";

// --- tool descriptions (shared only where the underlying behavior is identical
// across both surfaces: run_lua, lua_docs, and key all hit the same relay) ---

export const KEY_DESC =
  "Press a key or combo. Modifiers: LCtrl, LShift, LAlt, LMeta (Command on macOS — use LMeta for macOS shortcuts, LCtrl on Windows/Linux). " +
  'Non-modifier keys are NAMES, never glyphs: arrows are "Up"/"Down"/"Left"/"Right" (not ↑↓←→); also "Enter", "Tab", "Escape", "Space", "Backspace", "Delete", "Home", "End", "PageUp", "PageDown", "F1".."F12". ' +
  'Punctuation is spelled out: "Equal", "Minus", "Comma", "Period", "Slash", "Semicolon", "LeftBracket", "RightBracket", "Grave", "Backslash". ' +
  'Combos join with "+", e.g. "LCtrl+L" (focus address bar), "LMeta+A" (select all), "LAlt+Tab". ' +
  'Zoom in is "LMeta+Equal" / "LCtrl+Equal" (never "++" — the extra + splits into empty keys); zoom out uses "Minus". Escape closes dialogs; Space / PageDown scroll.';

export const RUN_LUA_DESC =
  "Run a Luau script on the connected machine through Rebind's engine and return its `return` value as JSON. " +
  "This is your PRIMARY tool and FIRST choice — it exposes the ENTIRE machine SDK (every namespace listed below; call lua_docs for the full function list) and is far faster, cheaper, and more reliable than the screenshot-and-click loop, which it sidesteps entirely. Default to it for ANYTHING that can be scripted. " +
  "The chunk runs ONCE and must end with `return <value>`: script hooks (OnDown/OnTick) never fire here, and coroutine-only calls " +
  '(Sleep, HID.Press, Dialog file pickers, Screen.Capture, Screen.FindImage, Screen.SearchForColor over 200k pixels) error — wait with System.Exec("sleep 0.5") instead, and take screenshots with the screenshot tool, not from a chunk. There is no Lua stdlib `io`/`os`/`require`. ' +
  "Use it to launch apps (System.ExecDetached), place windows (Window.Wait / Window.Move — on macOS the window handle is advisory and Move targets the FRONTMOST window, so bring the app forward first), run shell commands " +
  "(System.Exec(cmd) -> {exit,stdout,stderr}, absolute paths fine; inside a chunk it runs asynchronously on a background thread and does not block, so a slow command is safe), find UI by color in a small region (Screen.SearchForColor({x1,y1,x2,y2}, \"rrggbb\", tolerance), region under 200k pixels), type, click, read pixels (Screen.GetPixelColor), manage processes. " +
  "File.* (Read/Write/Append/ReadJSON/WriteJSON/Exists/Delete/List/MkDir/RmDir/Copy/Move/GetSize/GetTime/GetScriptDir) is jailed to the script dir: paths RELATIVE, absolute rejected. " +
  'A folder described as on the Desktop or in home is reachable at its BARE name from the jail root (e.g. File.List("myfolder")) — never prefix "Desktop/" or "~". ' +
  "JSON is JSON.Parse(s) and JSON.Stringify(v) — there is no JSON.Decode/Encode; for JSON files File.ReadJSON/File.WriteJSON is one call. " +
  "System.Exec commands run in an UNRELATED working directory — a relative shell path does NOT land in the File jail, so do file work with File.* (File.Write always works in the jail), and use absolute paths inside shell commands. " +
  'System.Exec takes ONE shell-command STRING — System.Exec("ls /tmp") — and its optional second parameter is {timeout, cwd}, NOT an argument array (an args table there is silently ignored and the bare command runs); only System.ExecDetached takes an args array. ' +
  'There is NO io.* or os.* — file work is File.*, shell work is System.Exec. App has Front/IsFront/IsRunning/Activate/Hide/Quit only — there is no App.List (installed apps are listed in your instructions). HID.Press takes ONE key; fire chords with HID.Combo("LMeta+C"). ' +
  "All namespaces: System, HID, Input, Screen, Window, App, Process, File, Clipboard, Net, Env, Log, UI, Bind, Timer, Math, JSON, Pipe, Audio, Dialog, Script, Regex, Config, Hash, Codec, Macro, Registry. " +
  'Example (move all .log files into d/logs and report the count): `File.MkDir("d/logs"); local n=0; for _,f in ipairs(File.List("d")) do if f:match("%.log$") then File.Move("d/"..f, "d/logs/"..f); n=n+1 end end; return n`. ' +
  "Call `lua_docs` for exact signatures BEFORE writing nontrivial scripts — do not guess APIs.";

export const LUA_DOCS_DESC =
  "Return the full Luau SDK type definitions for run_lua: every namespace, function signature, and type (~5k tokens, one call is enough). " +
  "Read this BEFORE writing any nontrivial run_lua script instead of guessing APIs.";
