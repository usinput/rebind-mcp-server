-- rebind sdk type definitions for luau language server
-- provides autocomplete, hover docs, and type checking for all sdk namespaces.
-- reference this file in your .luaurc: { "languageMode": "strict", "paths": ["types"] }

-- handle types

export type TaskHandle = {
  Cancel: (self: TaskHandle) -> (),
  IsRunning: (self: TaskHandle) -> boolean,
}

export type TimerHandle = {
  Cancel: (self: TimerHandle) -> (),
  Pause: (self: TimerHandle) -> (),
  Resume: (self: TimerHandle) -> (),
}

export type MacroHandle = {
  Stop: (self: MacroHandle) -> (),
  Pause: (self: MacroHandle) -> (),
  Resume: (self: MacroHandle) -> (),
  IsPlaying: (self: MacroHandle) -> boolean,
  GetProgress: (self: MacroHandle) -> number,
}

export type BindHandle = {
  unbind: (self: BindHandle) -> (),
  disable: (self: BindHandle) -> (),
  enable: (self: BindHandle) -> (),
  enabled: boolean,
}

export type ServerHandle = {
  port: number,
  Stop: (self: ServerHandle) -> (),
}

-- WebSocket: server-side per-connection handle passed to OnConnect/OnMessage/OnClose.
-- `id` is a monotonic identifier unique to this connection.
export type WsClient = {
  id: number,
  Send: (self: WsClient, text: string) -> (),
  SendBinary: (self: WsClient, bytes: string) -> (),
  Close: (self: WsClient) -> (),
}

-- WebSocket: server handle returned by Net.WSListen.
export type WsServerHandle = {
  port: number,
  Broadcast: (self: WsServerHandle, text: string) -> (),
  BroadcastBinary: (self: WsServerHandle, bytes: string) -> (),
  ClientCount: (self: WsServerHandle) -> number,
  Stop: (self: WsServerHandle) -> (),
}

-- WebSocket: outbound-connection handle returned by Net.WSConnect.
export type WsConnectHandle = {
  Send: (self: WsConnectHandle, text: string) -> (),
  SendBinary: (self: WsConnectHandle, bytes: string) -> (),
  Close: (self: WsConnectHandle) -> (),
}

-- WebSocket: server event-handler table passed to Net.WSListen.
-- All fields are optional; handlers that are absent are never called.
export type WsListenHandlers = {
  OnConnect: ((client: WsClient) -> ())?,
  OnMessage: ((client: WsClient, payload: string, isBinary: boolean) -> ())?,
  OnClose: ((client: WsClient) -> ())?,
}

-- WebSocket: client event-handler table passed to Net.WSConnect.
export type WsConnectHandlers = {
  OnOpen: (() -> ())?,
  OnMessage: ((payload: string, isBinary: boolean) -> ())?,
  OnClose: (() -> ())?,
}

export type PipeHandle = {
  name: string,
  size: number,
  capacity: number,
  Read: (self: PipeHandle) -> string?,
  Write: (self: PipeHandle, data: string) -> (),
  Close: (self: PipeHandle) -> (),
}

-- data types

export type WindowInfo = {
  title: string,
  process: string,
  x: number,
  y: number,
  width: number,
  height: number,
}

export type WindowEntry = {
  handle: number,
  title: string,
  process: string,
  x: number,
  y: number,
  width: number,
  height: number,
}

export type WindowPos = {
  x: number,
  y: number,
  width: number,
  height: number,
}

export type MousePos = {
  x: number,
  y: number,
}

export type ModifierState = {
  ctrl: boolean,
  shift: boolean,
  alt: boolean,
  win: boolean,
}

export type HttpResponse = {
  status: number,
  body: string,
  headers: { [string]: string },
}

-- `body` may contain arbitrary bytes (Luau strings are byte strings).
export type HttpRequest = {
  method: string,
  path: string,
  body: string,
  headers: { [string]: string },
}

-- `body` may contain arbitrary bytes; set a Content-Type header for binary.
export type HttpResponseSpec = {
  status: number?,
  body: string?,
  headers: { [string]: string }?,
}

export type HttpOptions = {
  timeout: number?,
}

export type HttpRequestOptions = {
  method: string,
  url: string,
  body: string?,
  headers: { [string]: string }?,
  timeout: number?,
}

-- macro action types

export type MacroMoveAction = {
  x: number,
  y: number,
  delay: number,
}

export type MacroExplicitAction = {
  action: string,
  code: string?,
  dx: number?,
  dy: number?,
  x: number?,
  y: number?,
  text: string?,
  amount: number?,
  holdMs: number?,
  charDelay: number?,
  delay: number,
}

export type MacroAction = MacroMoveAction | MacroExplicitAction

-- ui widget option types

export type WidgetOpts = {
  label: string?,
  tooltip: string?,
  group: string?,
  tab: string?,
  showIf: string?,
}

export type ToggleOpts = WidgetOpts

export type SliderOpts = WidgetOpts & {
  min: number?,
  max: number?,
  step: number?,
  suffix: string?,
}

export type KeybindOpts = WidgetOpts

export type SelectOpts = WidgetOpts

export type TextOpts = WidgetOpts & {
  placeholder: string?,
  maxLength: number?,
}

export type ColorOpts = WidgetOpts

export type RecordOpts = {
  ignore_mouse: boolean?,
  ignore_keyboard: boolean?,
  -- default "normal"
  precision: string?,
}

-- ui proxy: returned by UI.Schema, supports dynamic field access
-- cfg.key reads the current value, cfg.key = value writes it
export type UiProxy = { [string]: any }

-- bind config for table-style binding
export type BindConfig = {
  when: (() -> boolean)?,
  action: (() -> boolean?)?,
  release: (() -> ())?,
}

-- runtime identity table
export type RebindInfo = {
  min_sdk: string,
  tick_rate: number,
  version: string,
  name: string,
  runtime_uuid: string,
  id: string?,
  instance: string,
  -- host operating system: "windows" | "macos" | "linux"
  platform: string,
}

-- global functions

declare function Run(fn: () -> ()): TaskHandle
-- RunAsync was removed. Use Run() directly.
-- coroutine-only: Sleep must be called inside Run()/a scheduled coroutine.
-- Calling it from a plain hook body or a one-shot exec chunk errors at runtime.
declare function Sleep(ms: number): ()
declare function After(ms: number, fn: () -> ()): TaskHandle
-- wraps fn so it runs on the coroutine scheduler; when auto-spawned the call
-- returns false instead of fn's results.
declare function Async(fn: (...any) -> ...any): (...any) -> ...any
declare function print(...: any): ()
declare function require(module: string): any

-- global tables

declare _REBIND: RebindInfo

-- system namespace

export type ExecOptions = {
  -- milliseconds; default 5000. The process is killed on expiry and Exec errors.
  timeout: number?,
  -- working directory for the command; default: the host process's cwd.
  cwd: string?,
}

export type ExecResult = {
  exit: number,
  stdout: string,
  stderr: string,
}

export type ExecDetachedOptions = {
  cwd: string?,
}

declare System: {
  Time: () -> number,
  Mouse: () -> (number, number),
  Screen: () -> (number, number),
  Window: () -> WindowInfo,
  -- runs cmd through the shell (sh -c / cmd.exe), output capped at 64KB per
  -- stream. Requires the 'exec' permission. Return shape {exit,stdout,stderr}
  -- unchanged. Inside Run()/a coroutine it runs async off the tick thread
  -- (yields, resumes with the result on a later tick). From a plain hook body
  -- or one-shot chunk it falls back to bounded blocking (deprecated; warns
  -- once, blocks the tick thread — wrap it in Run()).
  Exec: (cmd: string, options: ExecOptions?) -> ExecResult,
  -- fire-and-forget spawn (no shell, argv array); returns the pid.
  ExecDetached: (cmd: string, args: { string }?, options: ExecDetachedOptions?) -> number,
  -- types text through the host OS (Unicode aware), never through the HID
  -- transport. raises when the OS refuses the injection.
  TypeText: (text: string) -> (),
}

-- hid namespace

declare HID: {
  Down: (code: string) -> (),
  Up: (code: string) -> (),
  -- coroutine-only (sleeps for holdMs): call inside Run(). From a plain
  -- chunk use Down+Up or Combo instead.
  Press: (code: string, holdMs: number?) -> (),
  -- fire a chord in one synchronous call (press L→R, release R→L). no sleep,
  -- so callable directly from a Bind action / OnDown. modifier tokens accept
  -- macOS aliases: "cmd", "opt"/"option", plus "ctrl"/"shift"/"alt"/"win".
  Combo: (code: string) -> (),
  -- instant whole-string insertion (native; no coroutine). For a human-like
  -- per-character typewriter effect use Typewriter (coroutine-only).
  Type: (text: string) -> (),
  Typewriter: (text: string, delayMs: number?) -> (),
  Move: (dx: number, dy: number) -> (),
  MoveTo: (x: number, y: number) -> (),
  Scroll: (amount: number) -> (),
  SetMouseMode: (mode: string) -> (),
  GetMouseMode: () -> string,
}

-- input namespace

declare Input: {
  IsDown: (code: string) -> boolean,
  GetDuration: (code: string) -> number,
  GetActiveKeys: () -> { string },
  GetMousePos: () -> MousePos,
  GetModifiers: () -> ModifierState,
}

-- ui namespace

declare UI: {
  Schema: (descriptors: { [string]: any }) -> UiProxy,
  Toggle: (default: boolean, opts: ToggleOpts?) -> any,
  Slider: (default: number, opts: SliderOpts?) -> any,
  Keybind: (default: string, opts: KeybindOpts?) -> any,
  Select: (default: string, choices: { string }, opts: SelectOpts?) -> any,
  Text: (default: string, opts: TextOpts?) -> any,
  Color: (default: string, opts: ColorOpts?) -> any,
  Get: (id: string) -> any,
  Set: (id: string, value: any) -> (),
  GetAll: () -> { [string]: any },
  GetSchema: () -> { any },
  Notify: (text: string, variant: string?) -> (),
}

-- bind namespace (callable table)

declare Bind: typeof(setmetatable({} :: {
  Toggle: (key: string, uiId: string) -> BindHandle,
  Remap: (from: string, to: string) -> BindHandle,
}, {} :: {
  __call: (self: any, key: string, config: (() -> boolean?) | BindConfig) -> BindHandle,
}))

-- timer namespace

declare Timer: {
  After: (ms: number, callback: () -> ()) -> TimerHandle,
  Every: (ms: number, callback: () -> ()) -> TimerHandle,
  CancelAll: () -> (),
}

-- macro namespace

declare Macro: {
  -- mode: "parallel" (default, plays alongside running macros) | "replace"
  -- (stops all running macros first).
  Play: (macro: { MacroAction }, speed: number?, mode: string?) -> MacroHandle,
  StopAll: () -> (),
  Record: (options: RecordOpts?) -> (),
  Finish: () -> { MacroAction },
  -- the saved-macro format: modeline, actions table, top-level Macro.Play.
  ToScript: (macro: { MacroAction }, name: string) -> string,
  Stream: (macro: { MacroAction }) -> (),
  Abort: () -> (),
}

-- math namespace

declare Math: {
  Random: (min: number, max: number) -> number,
  Gaussian: (mean: number, stdDev: number) -> number,
  Scale: (macro: { MacroAction }, xFactor: number, yFactor: number) -> { MacroAction },
  Spline: (macro: { MacroAction }, tension: number) -> { MacroAction },
  Resample: (macro: { MacroAction }, intervalMs: number) -> { MacroAction },
  TimeComp: (macro: { MacroAction }, targetMs: number) -> { MacroAction },
  -- mode: "linear" | anything else = positional curve (default).
  Interpolate: (macro: { MacroAction }, intervalMs: number, mode: string?) -> { MacroAction },
}

-- log namespace

declare Log: {
  Info: (msg: string) -> (),
  Warn: (msg: string) -> (),
  Error: (msg: string) -> (),
  Debug: (msg: string) -> (),
}

-- json namespace

declare JSON: {
  Parse: (s: string) -> any,
  Stringify: (value: any) -> string,
}

-- process namespace

export type ProcessEntry = {
  pid: number,
  name: string,
}

declare Process: {
  Exists: (name: string) -> number?,
  List: (name: string?) -> { ProcessEntry },
  Kill: (pid: number) -> boolean,
}

-- screen namespace

export type PixelMatch = {
  x: number,
  y: number,
}

export type MonitorEntry = {
  index: number,
  x: number,
  y: number,
  width: number,
  height: number,
  primary: boolean,
}

export type CaptureOptions = {
  -- 1-based display index; default: the display under the cursor.
  display: number?,
  -- display-local logical coords; default: the whole display.
  region: { x: number, y: number, w: number, h: number }?,
  -- downscale so the long edge is at most this; default and 0: native.
  max_edge: number?,
}

export type CaptureResult = {
  image: string, -- base64 PNG
  width: number,
  height: number,
  display: MonitorEntry,
  cursor: { x: number, y: number },
}

export type FindImageOptions = {
  display: number?,
  region: { x: number, y: number, w: number, h: number }?,
  -- 0.0 exact .. 1.0, per-channel fraction of 255 (same scale as SearchForColor).
  tolerance: number?,
  -- ratios to resample the needle by before scanning, tried in order; default { 1 }.
  scales: { number }?,
}

export type ImageMatch = {
  x: number,
  y: number,
  width: number,
  height: number,
}

declare Screen: {
  GetPixelColor: (x: number?, y: number?) -> string,
  -- reads the published frame. regions up to 200k physical pixels answer on the
  -- calling thread; larger ones yield inside Run() and are refused outside it.
  SearchForColor: (region: {number}, color: string, tolerance: number?) -> PixelMatch?,
  List: () -> { MonitorEntry },
  -- yields inside Run(); refused outside a coroutine.
  Capture: (options: CaptureOptions?) -> CaptureResult,
  -- needle is a PNG path relative to the script directory. yields inside Run(); refused outside a coroutine.
  FindImage: (needle: string, options: FindImageOptions?) -> ImageMatch?,
  -- usable desktop of the display containing the point (cursor when omitted).
  -- Windows only; raises elsewhere.
  WorkArea: (x: number?, y: number?) -> WindowPos,
}

-- window namespace

declare Window: {
  Find: (title: string) -> number?,
  List: (title: string?) -> { WindowEntry },
  GetTitle: (handle: number?) -> string,
  GetClass: (handle: number?) -> string,
  GetPos: (handle: number?) -> WindowPos,
  GetPID: (handle: number?) -> number,
  Activate: (handle: number) -> (),
  Move: (handle: number, x: number?, y: number?, width: number?, height: number?) -> (),
  SetAlwaysOnTop: (handle: number, enabled: boolean) -> (),
  SetTransparency: (handle: number, alpha: number) -> (),
  SetTitle: (handle: number, title: string) -> (),
  Minimize: (handle: number?) -> (),
  Maximize: (handle: number?) -> (),
  Restore: (handle: number?) -> (),
  Hide: (handle: number?) -> (),
  Show: (handle: number?) -> (),
  Close: (handle: number?) -> (),
  Kill: (handle: number?) -> (),
  IsVisible: (handle: number) -> boolean,
  IsActive: (handle: number?) -> boolean,
  GetForeground: () -> number?,
  FromPoint: (x: number, y: number) -> number?,
  -- "minimized" | "maximized" | "normal". Windows only; raises elsewhere.
  GetState: (handle: number?) -> string,
  Wait: (title: string, timeout: number?) -> number?,
  WaitActive: (title: string, timeout: number?) -> boolean,
  WaitClose: (title: string, timeout: number?) -> boolean,
}

-- app namespace: application-level control (Keyboard Maestro's Application
-- Control). names match case-insensitively by app display name. Front/IsRunning/
-- Activate are permission-free; Hide/Quit/IsHidden drive an AppleEvent and
-- prompt for macOS Automation permission on first use.

export type AppInfo = {
  name: string,
  pid: number,
}

declare App: {
  Front: () -> AppInfo?,
  IsFront: (name: string) -> boolean,
  IsRunning: (name: string) -> boolean,
  IsHidden: (name: string) -> boolean,
  Activate: (name: string) -> (),
  Hide: (name: string) -> (),
  Quit: (name: string) -> (),
}

-- net namespace

declare Net: {
  Get: (url: string, headers: { [string]: string }?, options: HttpOptions?) -> HttpResponse,
  Post: (url: string, body: string, headers: { [string]: string }?, options: HttpOptions?) -> HttpResponse,
  Put: (url: string, body: string, headers: { [string]: string }?, options: HttpOptions?) -> HttpResponse,
  Patch: (url: string, body: string, headers: { [string]: string }?, options: HttpOptions?) -> HttpResponse,
  Delete: (url: string, headers: { [string]: string }?, options: HttpOptions?) -> HttpResponse,
  Head: (url: string, headers: { [string]: string }?, options: HttpOptions?) -> HttpResponse,
  Request: (options: HttpRequestOptions) -> HttpResponse,
  Listen: (port: number, handler: (request: HttpRequest) -> HttpResponseSpec | string) -> ServerHandle,
  WSListen: (port: number, handlers: WsListenHandlers) -> WsServerHandle,
  WSConnect: (url: string, handlers: WsConnectHandlers) -> WsConnectHandle,
}

-- pipe namespace

declare Pipe: {
  Open: (name: string, options: { size: number? }?) -> PipeHandle,
}

-- file namespace

declare File: {
  Read: (path: string) -> string,
  ReadBytes: (path: string) -> string,
  Write: (path: string, content: string) -> (),
  Append: (path: string, content: string) -> (),
  Exists: (path: string) -> boolean,
  Delete: (path: string) -> boolean,
  -- nil path lists the script's own directory. Paths are relative to the
  -- script dir (the File.* jail); absolute paths are rejected.
  List: (path: string?) -> { string },
  MkDir: (path: string) -> boolean,
  -- recursive; returns true even when the directory did not exist.
  RmDir: (path: string) -> boolean,
  Copy: (src: string, dst: string) -> (),
  Move: (src: string, dst: string) -> (),
  ReadJSON: (path: string) -> any,
  WriteJSON: (path: string, value: any) -> (),
  GetScriptDir: () -> string,
  GetSize: (path: string) -> number,
  GetTime: (path: string) -> number,
  IsDir: (path: string) -> boolean,
  IsFile: (path: string) -> boolean,
}

-- audio namespace

export type PlayOptions = {
  volume: number?,
  loop: boolean?,
}

export type SoundHandle = {
  Stop: (self: SoundHandle) -> (),
  Pause: (self: SoundHandle) -> (),
  Resume: (self: SoundHandle) -> (),
  IsPlaying: (self: SoundHandle) -> boolean,
  SetVolume: (self: SoundHandle, vol: number) -> (),
  GetVolume: (self: SoundHandle) -> number,
}

declare Audio: {
  Beep: () -> (),
  Play: (path: string, options: PlayOptions?) -> SoundHandle,
  StopAll: () -> (),
  SetMasterVolume: (vol: number) -> (),
  GetMasterVolume: () -> number,
}

-- dialog namespace

export type DialogMessageOptions = {
  title: string?,
  level: string?,
}

export type DialogFileFilter = {
  name: string,
  extensions: { string },
}

export type DialogFileOptions = {
  title: string?,
  location: string?,
  filters: { DialogFileFilter }?,
}

-- every Dialog call is coroutine-only: it yields until the dialog closes and
-- errors outside Run(). the file and folder pickers return nil on cancel.
declare Dialog: {
  Message: (text: string, options: DialogMessageOptions?) -> (),
  Confirm: (text: string, options: DialogMessageOptions?) -> boolean,
  OpenFile: (options: DialogFileOptions?) -> string?,
  OpenDir: (options: DialogFileOptions?) -> string?,
  SaveFile: (options: DialogFileOptions?) -> string?,
}

-- clipboard namespace

declare Clipboard: {
  Get: () -> string?,
  Set: (text: string) -> (),
}

-- script namespace

declare Script: {
  Exit: (reason: string?) -> (),
  Reload: () -> (),
}

-- regex namespace

export type RegexMatch = {
  match: string,
  captures: { string },
  start: number,
  finish: number,
}

declare Regex: {
  IsMatch: (text: string, pattern: string) -> boolean,
  Find: (text: string, pattern: string) -> RegexMatch?,
  FindAll: (text: string, pattern: string) -> { RegexMatch },
  Replace: (text: string, pattern: string, replacement: string) -> string,
  ReplaceAll: (text: string, pattern: string, replacement: string) -> string,
  Split: (text: string, pattern: string) -> { string },
}

-- config namespace

declare Config: {
  ParseTOML: (text: string) -> { [string]: any },
  ToTOML: (value: { [string]: any }) -> string,
  ReadTOML: (path: string) -> { [string]: any },
  WriteTOML: (path: string, value: { [string]: any }) -> (),
}

-- hash namespace

declare Hash: {
  MD5: (data: string) -> string,
  SHA1: (data: string) -> string,
  SHA256: (data: string) -> string,
  SHA512: (data: string) -> string,
  CRC32: (data: string) -> number,
  HMAC: (algo: string, key: string, data: string) -> string,
}

-- codec namespace

declare Codec: {
  Base64: (data: string) -> string,
  Base64Decode: (str: string) -> string,
  Hex: (data: string) -> string,
  HexDecode: (str: string) -> string,
}

-- env namespace

declare Env: {
  Get: (name: string) -> string?,
  Set: (name: string, value: string) -> (),
  Home: () -> string?,
  Config: () -> string?,
  Data: () -> string?,
  Desktop: () -> string?,
  Documents: () -> string?,
  Downloads: () -> string?,
  AppData: () -> string?,
  Temp: () -> string?,
}

-- registry namespace (windows only)

declare Registry: {
  Read: (keyPath: string, valueName: string) -> string | number,
  Write: (keyPath: string, type: string, valueName: string, value: any) -> (),
  DeleteValue: (keyPath: string, valueName: string) -> (),
  DeleteKey: (keyPath: string) -> (),
  CreateKey: (keyPath: string) -> (),
}

-- valid key names for input hooks (OnDown, OnUp):
--
-- letters:     A-Z
-- numbers:     0-9
-- function:    F1-F12
-- mouse:       Mouse1 (left), Mouse2 (right), Mouse3 (middle), Mouse4, Mouse5
-- modifiers:   LCtrl, RCtrl, LShift, RShift, LAlt, RAlt, LWin, RWin
-- navigation:  Up, Down, Left, Right, Home, End, PageUp, PageDown, Insert, Delete
-- editing:     Backspace, Tab, Enter, Space, Escape
-- punctuation: Minus, Equal, LeftBrace, RightBrace, Backslash, Semicolon,
--              Apostrophe, Grave, Comma, Period, Slash
-- locks:       CapsLock, ScrollLock, NumLock
-- system:      PrintScreen, Pause, Menu
-- numpad:      Kp0-Kp9, KpPlus, KpMinus, KpMultiply, KpDivide, KpEnter, KpDot
--
-- HID output only (HID.Down, HID.Press, etc.):
-- function:    F13-F24
-- media:       MediaNext, MediaPrev, MediaStop, MediaPlay, VolumeUp, VolumeDown, Mute
-- aliases:     Numpad0-9, NP0-9, NPAdd, NPSubtract, NPMultiply, NPDivide, NPEnter,
--              NPDecimal, Ctrl, Shift, Alt, Win, Meta, Del, PgUp, PgDn, etc.

-- hooks: declare these as global functions in your script.
-- uncomment the ones you use; the runtime calls them when events occur.

-- declare function OnStart(): ()
-- declare function OnStop(): ()
-- declare function OnFocus(window: WindowInfo): ()
-- declare function OnBlur(window: WindowInfo): ()
-- declare function OnTick(dtMs: number): ()  -- ms elapsed since the previous OnTick (0 on the first)
-- declare function OnDown(key: string): boolean?
-- declare function OnUp(key: string, durationMs: number): boolean?
-- declare function OnMove(dx: number, dy: number): boolean?  -- return value only used with mouse_block=true (hardware mode only)
-- declare function OnScroll(delta: number): boolean?
-- declare function OnScrollH(delta: number): boolean?
-- declare function OnInputDown(key: string): ()
-- declare function OnInputUp(key: string, durationMs: number): ()
-- declare function OnInputMove(dx: number, dy: number): ()
-- declare function OnInputScroll(delta: number): ()
-- declare function OnError(message: string): ()
-- declare function OnReload(): ()
