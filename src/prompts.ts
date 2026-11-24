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

/** Tool-preference ladder. run_lua only appears when the surface/arm has it,
 *  and click_element only where the surface registers it (the MCP server). */
export function toolPriority(hasLua: boolean, hasElements = false): string {
  return `Tool priority, most to least preferred: ${hasLua ? "script (run_lua) > " : ""}keyboard > ${hasElements ? "click_element > " : ""}mouse > screenshot. If an application accepts keyboard input for the job — typed digits and operators, shortcuts, menu accelerators, type-to-select — use the keyboard: it is deterministic and needs no coordinates.${hasElements ? " To click a button, menu title, Dock or taskbar icon that has a name, use click_element before any screenshot: it reads the control's exact position from the operating system, with no picture and no coordinates to guess." : ""} Use the mouse only when no keyboard path exists, and screenshots only when you genuinely need to see state.`;
}

export const CLICK_ELEMENT_DESC =
  "Find a named control and click it, with no screenshot. It asks the operating system's accessibility tree for the controls apps describe to it (buttons, menu titles, tabs, Dock or taskbar icons) and their exact rectangles, then clicks the centre of the match. " +
  "It covers the front app's menu titles and windows plus the Dock on macOS, and the taskbar plus the foreground window on Windows. " +
  "name matches any part of a control's name, ignoring case; exact matches the whole name. id matches the platform's identifier (on macOS a window's buttons are AXCloseButton, AXMinimizeButton and AXFullScreenButton). " +
  "With click false it only lists the matches with their screen positions; call it with no name and click false to see the named controls it can reach (the first 60). " +
  "It clicks only when given a name or an id and exactly one control matches, or the one index names; with several, or with one from a lookup that did not finish, it lists them and clicks nothing unless index is given. index counts from 1 in the list this same name and id return, not in an unfiltered list. A control the system does not report at its own centre, usually because another window covers it, is listed as covered and is never clicked. " +
  "Native apps name most controls. Games, and many web and Electron apps, name little or nothing: an empty answer means fall back to the keyboard or a screenshot, not that the control is absent.";

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

/** which SDK names a run_lua chunk may use: the docs hold both sets */
export const RB_NAMES_NOTE =
  "The SDK has two sets of names for the same calls: the rb names (rb.hid.move_to) need Rebind 3.9.0 or later, and the v1 names (HID.MoveTo) run on every version. In run_lua use the v1 names unless you know this Rebind is 3.9.0 or later.";

/** MCP server only (the bench keeps its own prompt): keep what worked, as a
 *  script directory. `rebind run` is a watcher that never exits, so the agent
 *  starts it detached and ends it through the lifecycle manager. */
export const SAVE_WORK_DOCTRINE =
  'When a sequence works and the user wants to keep it, save it as a Rebind script so it runs again with no agent and no tokens. On the computer running Rebind, with an absolute path for <dir>: `rebind init <dir>` scaffolds rebind.toml and main.luau; put the sequence in main.luau bound to a key (Bind or OnDown, or rb.bind and rb.on from Rebind 3.9.0; hooks never fire inside run_lua, they do in a script); add `[runtime] permissions = [...]` to rebind.toml listing only what it uses; run `rebind check <dir>`; then start `rebind run <dir>`, which loads the script and reloads it on every edit. `rebind run` keeps running until it is stopped, so never wait on it: start it detached (System.ExecDetached("rebind", {"run", "<dir>"}) in run_lua, or a background process of your own shell when that shell is on the computer running Rebind), and end it by finding the script with `rebind ps` and running `rebind script stop` on it, after which the run command exits by itself. Do not package the script: never run `rebind pack`, `rebind install` of a .rbp file, or `rebind publish` unless the user asks for a package or says they are ready to distribute it. Tell the user which key runs it, and that a script run this way stops when its run ends or Rebind restarts. Installing it as a package is how it stays loaded: say so, and package it only when they then ask.';

/** MCP server only: the observe_* tools record the user, so they ask first.
 *  The script loop at its end is how the agent helps a user write a script. */
export const OBSERVE_DOCTRINE =
  "observe_start records the user, not you: every key and button they press and release (passwords included, by name), mouse movement, the active window, and screenshots of their screen, saved in Rebind's observations folder until they delete it. Use it to watch the user do a task before you script it. Never start one on your own: ask first, saying what it records, for how long, and the stop key if you set one, and start only after the user agrees. Tell them when recording has started, how it ends (the time limit, the stop key if set, or Stop observation in Rebind's tray menu), and not to type secrets. Then call observe_wait: it returns when the recording ends, so the user need not tell you; call it again while it says still recording. observe_stop only ends a recording early. Then read the recording with observe_events (log lines in seq order) and observe_frame (the screenshots its frame and crop lines name). observe_list shows every recording, including ones the user made in the app. " +
  "Script loop, for when the user wants help writing a script for something they do by hand: (1) Ask to watch them do it once, as above, with a stop key the app they work in ignores. (2) observe_start, then observe_wait until the recording ends. (3) Read it with observe_events and observe_frame, and take the steps, hold times, gaps and screen cues from the recording, not from the user's description. A step that was never shown is a guess: ask for another demonstration of it. (4) Write or refine the script and run it as the save steps say (`rebind check`, then a detached `rebind run`), with no action faster than the user's. (5) Ask the user to try it and say what is wrong. (6) Stop the running draft before recording again, or its hotkeys fire during the demonstration, then repeat from 1 for the part that is wrong, until the user says they are happy with the script. If observe_start answers that Allow observation is off, say where to turn it on (Remote Control's Options) and do not record any other way, run_lua included; if the user declines, work from their description.";

/** How the agent takes the user's task: do it, stay in scope, do not lecture. */
export const TASK_DOCTRINE =
  "Carry out the user's requested task with the available Rebind tools. Do not object or seek repeated permission merely because the task uses automation, a browser, scripts, or an existing signed-in session. Stay within the requested scope; access alone does not authorize unrelated actions. Respect the user's specified method when available and permitted. Ask a focused question if the target, authority, or a consequential action is unclear. Follow tool-specific consent requirements, and report actual results or blockers without moralizing.";

/** MCP `instructions`: clients cut this text (Claude Code at 4,096
 *  characters), so it holds only what must survive a cut and a compaction.
 *  Everything else is part 1 of rebind_docs. */
export function instructions(os: OS, parts: number): string {
  return [
    `You control a real ${os} computer through Rebind. Keyboard shortcuts use ${modifierNote(os)}.`,
    `Before anything else, call rebind_docs once for each part, 1 to ${parts}, and read every part: how to work on this computer, the full rebind CLI reference, and the full Luau SDK. Every other tool refuses until all ${parts} parts have been served.`,
    TASK_DOCTRINE,
    "observe_start records the user, not you: every key they press (passwords included, by name) and screenshots of their screen. Never start one on your own: ask first, as part 1 of rebind_docs says.",
    "Never run rebind pack, rebind install of a .rbp file, or rebind publish unless the user asks for a package or says they are ready to distribute their script.",
    "When the user wants help writing a script for something they do by hand, follow the script loop in part 1 of rebind_docs: with their agreement watch them do it, write the script from the recording, have them try it, and repeat until they are happy with it.",
  ].join("\n");
}

// --- setup mode: Remote Control did not answer when the server started ---

/** the official Remote Control listing, as `rebind install` takes it */
export const REMOTE_CONTROL_LISTING = "@rebind/remote-control";

/** What the user does after installing, from library/remote-control/README.md
 *  "Set up". The install never starts it: it would listen with no Auth token. */
export function remoteControlNext(url: string): string {
  const port = new URL(url).port;
  return `Tell the user to finish setup in Rebind: open the installed Remote Control package's main.luau and select Options, set a strong Auth token${port && port !== "19561" ? `, set WS port to ${port}` : ""}, then start it from the editor toolbar. Put the same token in REBIND_TOKEN in this MCP server's configuration, then restart or reconnect the rebind MCP server in the agent client; its computer-use tools load then.`;
}

/** install_remote_control's answer when `url` is another computer, which the
 *  rebind command here cannot reach. */
export function remoteControlElsewhere(url: string): string {
  return `${url} is another computer, so Remote Control cannot be installed from here. On the computer running Rebind, the user runs \`rebind install ${REMOTE_CONTROL_LISTING} --allow\` (it prints the permissions the package asks for), or installs Remote Control from the marketplace in the app. In its Options they turn off Local only so this computer can connect. ${remoteControlNext(url)}`;
}

/** MCP instructions when nothing answered on `url` at startup. */
export function remoteControlSetup(url: string, local: boolean): string {
  return [
    `Rebind's Remote Control package is not answering on ${url}, so this server has no computer-use tools yet. Either Rebind is not running, Remote Control is not installed, or it is installed but stopped; the server cannot tell which. Tell the user.`,
    local
      ? "Offer to install it with install_remote_control. Never install on your own: first call it without allow, which installs nothing and returns the permissions the package asks for. Show them to the user, say it installs the free Remote Control package into Rebind so an agent can control this computer's keyboard, mouse and screen, and call it again with allow true only after they agree. If the user says it is already installed, skip the install: they start it in Rebind and reconnect this server."
      : "install_remote_control returns the steps for the user to follow on the computer running Rebind.",
  ].join(" ");
}

export const INSTALL_REMOTE_CONTROL_DESC =
  "Install Rebind's free Remote Control package, which this server needs, through the rebind command on the computer running Rebind. Without allow it installs nothing and returns the permissions the package asks for: show them to the user, and call with allow true only after the user agrees. It never starts Remote Control; the result says what the user does next.";

// --- tool descriptions (shared only where the underlying behavior is identical
// across both surfaces: run_lua and key hit the same relay) ---

export const KEY_DESC =
  "Press a key or combo. Modifiers: LCtrl, LShift, LAlt, LMeta (Command on macOS — use LMeta for macOS shortcuts, LCtrl on Windows/Linux). " +
  'Non-modifier keys are NAMES, never glyphs: arrows are "Up"/"Down"/"Left"/"Right" (not ↑↓←→); also "Enter", "Tab", "Escape", "Space", "Backspace", "Delete", "Home", "End", "PageUp", "PageDown", "F1".."F12". ' +
  'Punctuation is spelled out: "Equal", "Minus", "Comma", "Period", "Slash", "Semicolon", "LeftBracket", "RightBracket", "Grave", "Backslash". ' +
  'Combos join with "+", e.g. "LCtrl+L" (focus address bar), "LMeta+A" (select all), "LAlt+Tab". ' +
  'Zoom in is "LMeta+Equal" / "LCtrl+Equal" (never "++" — the extra + splits into empty keys); zoom out uses "Minus". Escape closes dialogs; Space / PageDown scroll.';

/** `docsTool` names an on-demand docs tool (the bench's lua_docs); the MCP
 *  server passes none, since rebind_docs has been read before run_lua runs */
export const runLuaDesc = (docsTool?: string) =>
  "Run a Luau script on the connected machine through Rebind's engine and return its `return` value as JSON. " +
  `This is your PRIMARY tool and FIRST choice — it exposes the ENTIRE machine SDK (every namespace listed below${docsTool ? `; call ${docsTool} for the full function list` : ""}) and is far faster, cheaper, and more reliable than the screenshot-and-click loop, which it sidesteps entirely. Default to it for ANYTHING that can be scripted. ` +
  "The chunk runs ONCE and must end with `return <value>`: script hooks (OnDown/OnTick) never fire here, and coroutine-only calls " +
  '(Sleep, HID.Press, Dialog file pickers, Screen.Capture, Screen.FindImage, Screen.Elements, Screen.Read, Screen.FindText, Screen.WaitText, Screen.SearchForColor over 200k pixels) error — wait with System.Exec("sleep 0.5") instead, take screenshots with the screenshot tool, not from a chunk, and look up named controls with click_element. There is no Lua stdlib `io`/`os`/`require`. ' +
  "Use it to launch apps (System.ExecDetached), place windows (Window.Wait / Window.Move — on macOS the window handle is advisory and Move targets the FRONTMOST window, so bring the app forward first), run shell commands " +
  '(System.Exec(cmd) -> {exit,stdout,stderr}, absolute paths fine; inside a chunk it runs asynchronously on a background thread and does not block, so a slow command is safe), find UI by color in a small region (Screen.SearchForColor({x1,y1,x2,y2}, "rrggbb", tolerance), region under 200k pixels), type, click, read pixels (Screen.GetPixelColor), manage processes. ' +
  'File.* (Read/Write/Append/ReadJSON/WriteJSON/Exists/Delete/List/MkDir/RmDir/Copy/Move/GetSize/GetTime/GetScriptDir/GetDataDir) is jailed to the script dir: paths RELATIVE, absolute rejected. Paths starting "@data/" reach the script\'s data folder (3.13.0), which a chunk does not have. ' +
  'A folder described as on the Desktop or in home is reachable at its BARE name from the jail root (e.g. File.List("myfolder")) — never prefix "Desktop/" or "~". ' +
  "JSON is JSON.Parse(s) and JSON.Stringify(v) — there is no JSON.Decode/Encode; for JSON files File.ReadJSON/File.WriteJSON is one call. " +
  "System.Exec commands run in an UNRELATED working directory — a relative shell path does NOT land in the File jail, so do file work with File.* (File.Write always works in the jail), and use absolute paths inside shell commands. " +
  'System.Exec takes ONE shell-command STRING — System.Exec("ls /tmp") — and its optional second parameter is {timeout, cwd}, NOT an argument array (an args table there is silently ignored and the bare command runs); only System.ExecDetached takes an args array. ' +
  'There is NO io.* or os.* — file work is File.*, shell work is System.Exec. App has Front/IsFront/IsRunning/Activate/Hide/Quit only — there is no App.List (installed apps are listed in your instructions). HID.Press takes ONE key; fire chords with HID.Combo("LMeta+C"). ' +
  "All namespaces: System, HID, Input, Screen, Window, App, Process, File, Clipboard, Net, Env, Log, UI, Bind, Timer, Math, JSON, Pipe, Audio, Dialog, Script, Regex, Config, Hash, Codec, Macro, Registry. " +
  'Example (move all .log files into d/logs and report the count): `File.MkDir("d/logs"); local n=0; for _,f in ipairs(File.List("d")) do if f:match("%.log$") then File.Move("d/"..f, "d/logs/"..f); n=n+1 end end; return n`. ' +
  (docsTool
    ? `Call \`${docsTool}\` for exact signatures BEFORE writing nontrivial scripts — do not guess APIs.`
    : `${RB_NAMES_NOTE} Use only the signatures rebind_docs lists: do not guess APIs.`);

export const REBIND_DOCS_DESC =
  "Read this first, every part: how to work on this computer (tool choice, saving a script, recording the user), the full rebind CLI reference, and the full Luau SDK type definitions under both the rb names and the v1 names. Call it once for each part, from part 1, before any other tool: every other tool refuses until all parts have been served. Each answer says how many parts there are.";
