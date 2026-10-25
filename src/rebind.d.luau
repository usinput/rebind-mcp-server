-- Rebind SDK type definitions for the Luau language server: autocomplete,
-- hover docs and type checking for every SDK function.
-- Reference this file in your .luaurc: { "languageMode": "strict", "paths": ["types"] }
--
-- The rb names need Rebind 3.9.0 or later; the v1 names work on every
-- version.

-- handle types. A handle answers to its v1 method names on every version,
-- and to their snake_case forms from Rebind 3.9.0.

export type TaskHandle = {
  Cancel: (self: TaskHandle) -> (),
  IsRunning: (self: TaskHandle) -> boolean,
  stop: (self: TaskHandle) -> (),
  is_running: (self: TaskHandle) -> boolean,
}

export type TimerHandle = {
  Cancel: (self: TimerHandle) -> (),
  Pause: (self: TimerHandle) -> (),
  Resume: (self: TimerHandle) -> (),
  stop: (self: TimerHandle) -> (),
  pause: (self: TimerHandle) -> (),
  resume: (self: TimerHandle) -> (),
  is_running: (self: TimerHandle) -> boolean,
}

export type MacroHandle = {
  Stop: (self: MacroHandle) -> (),
  Pause: (self: MacroHandle) -> (),
  Resume: (self: MacroHandle) -> (),
  IsPlaying: (self: MacroHandle) -> boolean,
  GetProgress: (self: MacroHandle) -> number,
  -- coroutine-only: waits until the macro finishes
  Wait: (self: MacroHandle) -> (),
  stop: (self: MacroHandle) -> (),
  pause: (self: MacroHandle) -> (),
  resume: (self: MacroHandle) -> (),
  is_playing: (self: MacroHandle) -> boolean,
  get_progress: (self: MacroHandle) -> number,
  -- coroutine-only: waits until the macro finishes
  wait: (self: MacroHandle) -> (),
}

export type BindHandle = {
  unbind: (self: BindHandle) -> (),
  stop: (self: BindHandle) -> (),
  disable: (self: BindHandle) -> (),
  enable: (self: BindHandle) -> (),
  enabled: boolean,
}

-- returned by rb.on (Rebind 3.9.0 and later); stop removes the handler
export type EventHandle = {
  stop: (self: EventHandle) -> (),
}

export type ServerHandle = {
  port: number,
  Stop: (self: ServerHandle) -> (),
  stop: (self: ServerHandle) -> (),
}

-- UDP: socket handle returned by Net.UDPListen. SendTo sends from the bound
-- address and returns false when the send fails or the socket is stopped.
export type UdpHandle = {
  port: number,
  SendTo: (self: UdpHandle, ip: string, port: number, bytes: string) -> boolean,
  Stop: (self: UdpHandle) -> (),
  send_to: (self: UdpHandle, ip: string, port: number, bytes: string) -> boolean,
  stop: (self: UdpHandle) -> (),
}

-- WebSocket: server-side per-connection handle passed to OnConnect/OnMessage/OnClose.
-- `id` is a monotonic identifier unique to this connection.
export type WsClient = {
  id: number,
  Send: (self: WsClient, text: string) -> (),
  SendBinary: (self: WsClient, bytes: string) -> (),
  Close: (self: WsClient) -> (),
  send: (self: WsClient, text: string) -> (),
  send_binary: (self: WsClient, bytes: string) -> (),
  close: (self: WsClient) -> (),
}

-- WebSocket: server handle returned by Net.WSListen.
export type WsServerHandle = {
  port: number,
  Broadcast: (self: WsServerHandle, text: string) -> (),
  BroadcastBinary: (self: WsServerHandle, bytes: string) -> (),
  ClientCount: (self: WsServerHandle) -> number,
  Stop: (self: WsServerHandle) -> (),
  broadcast: (self: WsServerHandle, text: string) -> (),
  broadcast_binary: (self: WsServerHandle, bytes: string) -> (),
  client_count: (self: WsServerHandle) -> number,
  stop: (self: WsServerHandle) -> (),
}

-- WebSocket: outbound-connection handle returned by Net.WSConnect.
export type WsConnectHandle = {
  Send: (self: WsConnectHandle, text: string) -> (),
  SendBinary: (self: WsConnectHandle, bytes: string) -> (),
  Close: (self: WsConnectHandle) -> (),
  send: (self: WsConnectHandle, text: string) -> (),
  send_binary: (self: WsConnectHandle, bytes: string) -> (),
  close: (self: WsConnectHandle) -> (),
}

-- WebSocket: server event-handler table passed to Net.WSListen.
-- All fields are optional; handlers that are absent are never called.
-- From Rebind 3.9.0 each handler is also read under its snake_case name.
export type WsListenHandlers = {
  OnConnect: ((client: WsClient) -> ())?,
  OnMessage: ((client: WsClient, payload: string, isBinary: boolean) -> ())?,
  OnClose: ((client: WsClient) -> ())?,
  on_connect: ((client: WsClient) -> ())?,
  on_message: ((client: WsClient, payload: string, is_binary: boolean) -> ())?,
  on_close: ((client: WsClient) -> ())?,
}

-- WebSocket: client event-handler table passed to Net.WSConnect.
-- From Rebind 3.9.0 each handler is also read under its snake_case name.
export type WsConnectHandlers = {
  OnOpen: (() -> ())?,
  OnMessage: ((payload: string, isBinary: boolean) -> ())?,
  OnClose: (() -> ())?,
  on_open: (() -> ())?,
  on_message: ((payload: string, is_binary: boolean) -> ())?,
  on_close: (() -> ())?,
}

export type PipeHandle = {
  name: string,
  size: number,
  capacity: number,
  Read: (self: PipeHandle) -> string?,
  Write: (self: PipeHandle, data: string) -> (),
  Close: (self: PipeHandle) -> (),
  read: (self: PipeHandle) -> string?,
  write: (self: PipeHandle, data: string) -> (),
  close: (self: PipeHandle) -> (),
}

export type SoundHandle = {
  Stop: (self: SoundHandle) -> (),
  Pause: (self: SoundHandle) -> (),
  Resume: (self: SoundHandle) -> (),
  IsPlaying: (self: SoundHandle) -> boolean,
  SetVolume: (self: SoundHandle, vol: number) -> (),
  GetVolume: (self: SoundHandle) -> number,
  stop: (self: SoundHandle) -> (),
  pause: (self: SoundHandle) -> (),
  resume: (self: SoundHandle) -> (),
  is_playing: (self: SoundHandle) -> boolean,
  set_volume: (self: SoundHandle, vol: number) -> (),
  get_volume: (self: SoundHandle) -> number,
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

-- the input device a key, button, move or scroll came from. hooks get nil
-- where the source cannot tell devices apart (Windows and macOS software mode)
export type InputDevice = {
  id: string,
  name: string,
  nickname: string?,
  kind: "keyboard" | "mouse" | "gamepad" | "joystick" | "other",
  vid: string,
  pid: string,
  source: "vm",
  exact: boolean,
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

-- a joypad state; every field is optional and defaults to neutral. buttons
-- lists pressed buttons 1-32, hat is 0 (up) to 7 clockwise (nil = centered),
-- x/y/z/rz are -1..1 (0 = center), slider and dial are 0..1.
export type JoypadState = {
  buttons: { number }?,
  hat: number?,
  x: number?,
  y: number?,
  z: number?,
  rz: number?,
  slider: number?,
  dial: number?,
}

export type ProcessEntry = {
  pid: number,
  name: string,
}

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

export type AppInfo = {
  name: string,
  pid: number,
}

export type PlayOptions = {
  volume: number?,
  loop: boolean?,
}

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

export type RegexMatch = {
  match: string,
  captures: { string },
  start: number,
  finish: number,
}

-- macro action types

export type MacroMoveAction = {
  x: number,
  y: number,
  delay: number,
}

-- from Rebind 3.9.0, holdMs and charDelay are also read as hold_ms and
-- char_delay
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
  hold_ms: number?,
  char_delay: number?,
  delay: number,
}

export type MacroAction = MacroMoveAction | MacroExplicitAction

-- ui widget option types; from Rebind 3.9.0, showIf and maxLength are also
-- read as show_if and max_length

export type WidgetOpts = {
  label: string?,
  tooltip: string?,
  group: string?,
  tab: string?,
  showIf: string?,
  show_if: string?,
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
  max_length: number?,
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
  device: string?, -- nickname or id: the bind answers only to that device
  when: ((device: InputDevice?) -> boolean)?,
  action: ((device: InputDevice?) -> boolean?)?,
  release: ((device: InputDevice?) -> ())?,
}

-- runtime identity table
export type RebindInfo = {
  min_sdk: string,
  tick_rate: number,
  version: string,
  name: string,
  runtime_uuid: string,
  instance: string,
  -- host operating system: "windows" | "macos"
  platform: string,
}

-- options of the rb calls that take one options table (Rebind 3.9.0 and later)

export type RbHttpOptions = {
  headers: { [string]: string }?,
  timeout: number?,
}

export type RbPlayOptions = {
  -- playback speed multiplier
  speed: number?,
  -- "parallel" (default, plays alongside running macros) | "replace"
  -- (stops all running macros first)
  mode: string?,
}

export type RbExecDetachedOptions = {
  args: { string }?,
  cwd: string?,
}

-- fields left out keep their current value
export type RbWindowRect = {
  x: number?,
  y: number?,
  width: number?,
  height: number?,
}

export type RbBindOptions = {
  -- false lets the key through to the system; default: the key is taken
  swallow: boolean?,
  -- checked on each press; false skips the bind for that press
  when: ((device: InputDevice?) -> boolean)?,
  -- runs when the key is released
  release: ((device: InputDevice?) -> ())?,
  -- nickname or id: the bind answers only to that device
  device: string?,
}

-- rb.ai and rb.phone are Rebind Pro (a 7-day trial starts on first use).
-- Each rb.ai call waits for the model, so call it inside rb.run; its cost
-- counts against the monthly AI allowance. A script that declares
-- permissions needs ai, or ai:decide, ai:find or ai:read. A window option
-- names a window by title (or app name on macOS); the call reads the screen
-- pixels inside that window's rectangle, through the screen: permission.

export type AiDecideOptions = {
  choices: { string },
  -- send the display under the cursor (the target window under screen:target)
  screen: boolean?,
  -- send this window instead
  window: string?,
}

export type AiFindOptions = {
  -- look in this window; default: the display under the cursor
  window: string?,
}

export type AiReadOptions = {
  window: string?,
  -- read only around this point (screen coordinates, such as rb.ai.find's)
  at: AiPoint?,
}

-- screen coordinates, for rb.hid.move_to
export type AiPoint = {
  x: number,
  y: number,
}

export type RbAi = {
  -- picks one of opts.choices; returns it and the model's confidence (0 to 1)
  decide: (question: string, opts: AiDecideOptions) -> (string, number),
  -- the centre of what is described, or nil when it is not visible
  find: (what: string, opts: AiFindOptions?) -> AiPoint?,
  -- the text described, as it appears on screen
  read: (what: string, opts: AiReadOptions?) -> string,
}

export type PhoneResult = {
  delivered: boolean,
  reason: string?,
}

export type RbPhone = {
  -- no phone app yet: returns { delivered = false, reason = "no phone connected" }
  notify: (text: string, title: string?) -> PhoneResult,
}

-- a colour is "#rrggbb" or "#rrggbbaa"; in widget text it may also be a theme
-- role: "text", "dim", "faint", "accent", "positive", "warning" or "danger"
export type OverlaySpan = string | { any }

-- a string (a newline starts a line) or one line of spans
export type OverlayText = string | { OverlaySpan }

-- one draw operation in a surface, in logical units from its top-left corner
export type OverlayOp = {
  kind: "rect" | "text",
  x: number?,
  y: number?,
  -- rect
  w: number?,
  h: number?,
  fill: string?,
  border: string?,
  border_width: number?,
  radius: number?,
  -- true (50% black), false, or the shadow's opacity from 0 to 1
  shadow: (boolean | number)?,
  -- text: one line, as text plus color and bold, or as spans
  text: string?,
  spans: { OverlaySpan }?,
  color: string?,
  bold: boolean?,
  size: number?,
}

-- where a surface goes: x and y in rb.screen coordinates, or an anchor
-- ("top-left", "top", "top-right", "left", "center", "right", "bottom-left",
-- "bottom", "bottom-right") on a display ("active": the foreground window's
-- monitor, "primary", "mouse"), moved offset_x and offset_y inward
export type OverlayPlacement = {
  x: number?,
  y: number?,
  anchor: string?,
  display: ("active" | "primary" | "mouse")?,
  offset_x: number?,
  offset_y: number?,
}

export type OverlaySurfaceOptions = OverlayPlacement & {
  width: number,
  height: number,
  opacity: number?,
  ops: { OverlayOp }?,
}

export type OverlaySurface = {
  -- merges fields into the surface; x/y and anchor/display replace each other
  set: (self: OverlaySurface, fields: { [string]: any }) -> OverlaySurface,
  draw: (self: OverlaySurface, ops: { OverlayOp }) -> OverlaySurface,
  remove: (self: OverlaySurface) -> (),
}

-- shared by the widgets; theme is a name from rb.overlay.themes or a table
-- of the same roles
export type OverlayWidgetOptions = OverlayPlacement & {
  theme: (string | { [string]: any })?,
  size: number?,
}

export type OverlayToastOptions = OverlayWidgetOptions & {
  title: string?,
  meta: string?,
  -- ms on screen (default 4000)
  duration: number?,
  -- ms to wait for hidden overlays to show before giving up (default 60000)
  expires: number?,
  max_width: number?,
}

export type OverlayToast = {
  close: () -> (),
}

export type OverlayMenuItem = string | {
  label: string,
  hint: string?,
  action: ((index: number, item: any) -> ())?,
}

export type OverlayMenuOptions = OverlayWidgetOptions & {
  title: string?,
  subtitle: string?,
  width: number?,
  keep_open: boolean?,
  on_select: ((index: number, item: any) -> ())?,
  on_close: (() -> ())?,
}

export type OverlayMenu = {
  selected: number,
  select: (index: number) -> (),
  close: () -> (),
}

export type OverlayStatus = {
  set: (text: OverlayText) -> OverlayStatus,
  remove: () -> (),
}

export type OverlayProgressOptions = OverlayWidgetOptions & {
  -- logical units (default 320)
  width: number?,
}

export type OverlayProgress = {
  set: (fraction: number?, label: string?) -> OverlayProgress,
  remove: () -> (),
}

export type RbOverlay = {
  -- a surface you draw yourself; at most 16 per script covering at most
  -- 2,000,000 square units together, removed when the script stops
  surface: (options: OverlaySurfaceOptions) -> OverlaySurface,
  -- width and height of one line of text in the bundled monospace face
  measure: (text: string, size: number?, bold: boolean?) -> (number, number),
  -- false only when the OS is known to hide overlays (Windows: an exclusive
  -- full-screen Direct3D game; macOS: the overlays on screen covered for 2
  -- seconds, so with none on screen it is true)
  visible: () -> boolean,
  -- removes every surface of this script
  clear: () -> (),
  -- "rebind", "rebind-light", "catppuccin", "tokyo-night", "contrast"
  themes: { [string]: { [string]: any } },
  -- a timed notification; toasts at one anchor stack, and one asked for while
  -- overlays are hidden waits until they show or it expires. A waiting toast
  -- that then cannot show is dropped with a warning in the script's log.
  toast: (text: OverlayText, options: OverlayToastOptions?) -> OverlayToast,
  -- a keyboard menu: while open it takes Up, Down, Enter, Escape and 1 to 9 and
  -- swallows them. A pick closes it (unless keep_open), then runs the item's
  -- action and on_select. Losing focus or the OS hiding overlays also closes
  -- it; on_close runs for every close except rb.overlay.clear() and stopping.
  -- nil and a reason when overlays are hidden, the script is unfocused, or a
  -- menu is already open, in this script or another.
  menu: (items: { OverlayMenuItem }, options: OverlayMenuOptions?) -> (OverlayMenu?, string?),
  -- a one-line strip that stays until removed
  status: (text: OverlayText, options: OverlayWidgetOptions?) -> OverlayStatus,
  -- a labelled bar, fraction 0 to 1
  progress: (label: string, fraction: number?, options: OverlayProgressOptions?) -> OverlayProgress,
}

-- events for rb.on (Rebind 3.9.0 and later), with the arguments each
-- handler receives. For down, up, scroll and axis, a handler that returns
-- false swallows the input; for move only with mouse_block=true.
export type Event =
  | "start" -- ()
  | "stop" -- ()
  | "focus" -- (window: WindowInfo)
  | "blur" -- (window: WindowInfo)
  | "tick" -- (dt_ms: number)
  | "error" -- (message: string)
  | "reload" -- ()
  | "down" -- (key: string, device: InputDevice?)
  | "up" -- (key: string, duration_ms: number, device: InputDevice?)
  | "move" -- (dx: number, dy: number, device: InputDevice?) hardware mode only
  | "scroll" -- (delta: number, device: InputDevice?)
  | "scroll_h" -- (delta: number)
  | "axis" -- (axis: string, value: number, device: InputDevice?) hardware mode only
  | "input_down" -- (key: string, device: InputDevice?)
  | "input_up" -- (key: string, duration_ms: number, device: InputDevice?)
  | "input_move" -- (dx: number, dy: number, device: InputDevice?)
  | "input_scroll" -- (delta: number, device: InputDevice?)

-- valid key names for input events and binds:
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
-- delivered as input only in hardware mode:
-- function:    F13-F24
-- media:       MediaNext, MediaPrev, MediaStop, MediaPlay, VolumeUp, VolumeDown, VolumeMute
--
-- game controllers, hardware mode only (named by position, Xbox letters):
-- buttons:     PadA (bottom), PadB (right), PadX (left), PadY (top), PadLB,
--              PadRB, PadLT, PadRT, PadView, PadMenu, PadHome, PadLS, PadRS,
--              PadUp, PadDown, PadLeft, PadRight, PadP1-PadP4 (paddles)
-- other pads:  Joy1-Joy32, in the order the controller reports them
-- axes:        LeftX, LeftY, RightX, RightY (-1..1, up and left negative),
--              LT, RT (0..1); the "axis" event and input.axis use these
--
-- HID output and bind chord modifiers only:
-- aliases:     Numpad0-9, NP0-9, NPAdd, NPSubtract, NPMultiply, NPDivide, NPEnter,
--              NPDecimal, Ctrl, Shift, Alt, Win, Meta, Del, PgUp, PgDn, etc.

-- rb
-- The scripting surface, for scripts that declare min_sdk=3.9.0 or later.
-- Every name is the snake_case of a v1 name (HID.MoveTo is rb.hid.move_to).
-- Hooks are rb.on(event, fn) and key names passed to rb ignore case.

declare rb: {
  -- runtime identity: script name, versions, platform
  info: RebindInfo,
  -- runs fn as a coroutine, where rb.sleep and other coroutine-only calls work
  run: (fn: () -> ()) -> TaskHandle,
  -- coroutine-only: call inside rb.run
  sleep: (ms: number) -> (),
  after: (ms: number, fn: () -> ()) -> TaskHandle,
  -- wraps fn so it runs on the coroutine scheduler; when auto-spawned the call
  -- returns false instead of fn's results.
  async: (fn: (...any) -> ...any) -> (...any) -> ...any,
  -- adds a handler for an event; handlers run in the order they were added.
  -- returns a handle whose stop removes the handler.
  on: (event: Event, fn: (...any) -> boolean?) -> EventHandle,
  -- rb.bind(key, fn, options) takes the key unless options.swallow is false.
  -- the callback's return value is ignored.
  bind: typeof(setmetatable({} :: {
    toggle: (key: string, ui_id: string) -> BindHandle,
    remap: (from: string, to: string) -> BindHandle,
  }, {} :: {
    __call: (self: any, key: string, fn: ((device: InputDevice?) -> ...any)?, options: RbBindOptions?) -> BindHandle,
  })),
  -- each level takes any number of values, joined like print
  log: {
    info: (...any) -> (),
    warn: (...any) -> (),
    error: (...any) -> (),
    debug: (...any) -> (),
  },
  system: {
    time: () -> number,
    mouse: () -> (number, number),
    screen: () -> (number, number),
    window: () -> WindowInfo,
    -- runs cmd through the shell (sh -c / cmd.exe), output capped at 64KB per
    -- stream. Requires the 'exec' permission. Inside rb.run it runs off the
    -- tick thread; elsewhere it blocks the tick thread and warns once.
    exec: (cmd: string, options: ExecOptions?) -> ExecResult,
    -- fire-and-forget spawn (no shell, argv array); returns the pid.
    exec_detached: (cmd: string, options: RbExecDetachedOptions?) -> number,
    -- types text through the host OS (Unicode aware), never through the HID
    -- transport. raises when the OS refuses the injection.
    type_text: (text: string) -> (),
  },
  hid: {
    down: (code: string) -> (),
    up: (code: string) -> (),
    -- coroutine-only (sleeps for hold_ms): call inside rb.run. From a plain
    -- chunk use down and up, or combo.
    press: (code: string, hold_ms: number?) -> (),
    -- fires a chord in one synchronous call (press left to right, release
    -- right to left). modifier tokens accept macOS aliases: "cmd",
    -- "opt"/"option", plus "ctrl"/"shift"/"alt"/"win".
    combo: (code: string) -> (),
    -- instant whole-string insertion; typewriter types one character at a
    -- time and is coroutine-only.
    type: (text: string) -> (),
    typewriter: (text: string, delay_ms: number?) -> (),
    move: (dx: number, dy: number) -> (),
    -- exact in Windows and macOS software mode; on a Rebind Link it moves,
    -- rereads the cursor and corrects until within 2 px (about 150 ms at
    -- most), waiting with sleep in rb.run and blocking elsewhere. With ms
    -- it glides there over ms on an eased path; a duration needs rb.run or
    -- rb.async.
    move_to: (x: number, y: number, ms: number?) -> (),
    scroll: (amount: number) -> (),
    -- deprecated: the mode is stored but no longer changes move_to
    set_mouse_mode: (mode: string) -> (),
    get_mouse_mode: () -> string,
    -- keyboard HID usage for a key name, or nil (media keys return nil). down,
    -- up, press and combo also accept "usage:N" (decimal or 0x hex, 0x04-0xE7).
    usage: (name: string) -> number?,
    -- sets the whole joypad state (last write wins across scripts). Needs a
    -- Rebind Link whose USB profile has a joypad; raises otherwise. down, up,
    -- press and combo also press controller buttons ("PadA").
    joypad: (state: JoypadState?) -> (),
    -- holds one controller axis (LeftX..RightY -1..1, LT/RT 0..1) until set
    -- again or reset; it wins over a captured controller's value
    axis: (name: string, value: number) -> (),
    -- drops what scripts set, keeping what a captured controller holds; the
    -- relay also does this when a script stops or errors
    joypad_reset: () -> (),
  },
  input: {
    is_down: (code: string) -> boolean,
    -- a controller axis by name, 0 at rest
    axis: (name: string) -> number,
    -- the devices Rebind has identified (3.12.0); empty in software mode
    devices: () -> { InputDevice },
    duration: (code: string) -> number,
    keys: () -> { string },
    mouse_pos: () -> MousePos,
    modifiers: () -> ModifierState,
  },
  ui: {
    schema: (descriptors: { [string]: any }) -> UiProxy,
    toggle: (default: boolean, opts: ToggleOpts?) -> any,
    slider: (default: number, opts: SliderOpts?) -> any,
    keybind: (default: string, opts: KeybindOpts?) -> any,
    select: (default: string, choices: { string }, opts: SelectOpts?) -> any,
    text: (default: string, opts: TextOpts?) -> any,
    color: (default: string, opts: ColorOpts?) -> any,
    get: (id: string) -> any,
    set: (id: string, value: any) -> (),
    get_all: () -> { [string]: any },
    get_schema: () -> { any },
    notify: (text: string, variant: string?) -> (),
  },
  timer: {
    after: (ms: number, callback: () -> ()) -> TimerHandle,
    every: (ms: number, callback: () -> ()) -> TimerHandle,
    stop_all: () -> (),
  },
  macro: {
    play: (macro: { MacroAction }, options: RbPlayOptions?) -> MacroHandle,
    stop_all: () -> (),
    record: (options: RecordOpts?) -> (),
    finish: () -> { MacroAction },
    -- the saved-macro format: a `macro=true` modeline, then `return` of the
    -- actions. require() of a saved macro returns the actions.
    to_script: (macro: { MacroAction }, name: string) -> string,
    stream: (macro: { MacroAction }) -> (),
    abort: () -> (),
  },
  math: {
    random: (min: number, max: number) -> number,
    gaussian: (mean: number, std_dev: number) -> number,
    scale: (macro: { MacroAction }, x_factor: number, y_factor: number) -> { MacroAction },
    spline: (macro: { MacroAction }, tension: number) -> { MacroAction },
    resample: (macro: { MacroAction }, interval_ms: number) -> { MacroAction },
    time_comp: (macro: { MacroAction }, target_ms: number) -> { MacroAction },
    -- mode: "linear" | anything else = positional curve (default).
    interpolate: (macro: { MacroAction }, interval_ms: number, mode: string?) -> { MacroAction },
  },
  json: {
    parse: (s: string) -> any,
    stringify: (value: any) -> string,
  },
  process: {
    exists: (name: string) -> number?,
    list: (name: string?) -> { ProcessEntry },
    kill: (pid: number) -> boolean,
  },
  -- pixel reads are limited by a screen:target or screen:none permission entry
  screen: {
    pixel_hex: (x: number?, y: number?) -> string,
    -- reads the published frame. regions up to 200k physical pixels answer on
    -- the calling thread; larger ones yield inside rb.run and are refused
    -- outside it.
    search_color: (region: { number }, color: string, tolerance: number?) -> PixelMatch?,
    list: () -> { MonitorEntry },
    -- yields inside rb.run; refused outside a coroutine.
    capture: (options: CaptureOptions?) -> CaptureResult,
    -- needle is a PNG path relative to the script directory. yields inside
    -- rb.run; refused outside a coroutine.
    find_image: (needle: string, options: FindImageOptions?) -> ImageMatch?,
    -- usable desktop of the display containing the point (cursor when omitted).
    -- Windows only; raises elsewhere.
    work_area: (x: number?, y: number?) -> WindowPos,
  },
  window: {
    find: (title: string) -> number?,
    list: (title: string?) -> { WindowEntry },
    get_title: (handle: number?) -> string,
    get_class: (handle: number?) -> string,
    get_pos: (handle: number?) -> WindowPos,
    get_pid: (handle: number?) -> number,
    activate: (handle: number) -> (),
    move: (handle: number?, rect: RbWindowRect?) -> (),
    set_always_on_top: (handle: number, enabled: boolean) -> (),
    set_transparency: (handle: number, alpha: number) -> (),
    set_title: (handle: number, title: string) -> (),
    minimize: (handle: number?) -> (),
    maximize: (handle: number?) -> (),
    restore: (handle: number?) -> (),
    hide: (handle: number?) -> (),
    show: (handle: number?) -> (),
    close: (handle: number?) -> (),
    kill: (handle: number?) -> (),
    is_visible: (handle: number) -> boolean,
    is_active: (handle: number?) -> boolean,
    get_foreground: () -> number?,
    from_point: (x: number, y: number) -> number?,
    -- "minimized" | "maximized" | "normal". Windows only; raises elsewhere.
    get_state: (handle: number?) -> string,
    wait: (title: string, timeout: number?) -> number?,
    wait_active: (title: string, timeout: number?) -> boolean,
    wait_close: (title: string, timeout: number?) -> boolean,
  },
  -- application control. macOS matches app display names ignoring case;
  -- Windows matches executable names (".exe" optional) and cannot hide.
  -- activate focuses a running app only (it needs Accessibility on macOS);
  -- start one with rb.system.exec_detached (permission: exec).
  app: {
    front: () -> AppInfo?,
    is_front: (name: string) -> boolean,
    is_running: (name: string) -> boolean,
    is_hidden: (name: string) -> boolean,
    activate: (name: string) -> (),
    hide: (name: string) -> (),
    quit: (name: string) -> (),
  },
  -- permission: net, or net:<host> for the client calls and ws_connect
  net: {
    get: (url: string, options: RbHttpOptions?) -> HttpResponse,
    post: (url: string, body: string, options: RbHttpOptions?) -> HttpResponse,
    put: (url: string, body: string, options: RbHttpOptions?) -> HttpResponse,
    patch: (url: string, body: string, options: RbHttpOptions?) -> HttpResponse,
    delete: (url: string, options: RbHttpOptions?) -> HttpResponse,
    head: (url: string, options: RbHttpOptions?) -> HttpResponse,
    request: (options: HttpRequestOptions) -> HttpResponse,
    listen: (port: number, handler: (request: HttpRequest) -> HttpResponseSpec | string) -> ServerHandle,
    -- options.host binds one IP ("127.0.0.1" keeps it on this computer); default all interfaces
    ws_listen: (port: number, handlers: WsListenHandlers, options: { host: string? }?) -> WsServerHandle,
    ws_connect: (url: string, handlers: WsConnectHandlers) -> WsConnectHandle,
    -- binds a UDP socket; handler receives each datagram's raw bytes and sender.
    udp_listen: (bind_ip: string, port: number, handler: (data: string, ip: string, port: number) -> ()) -> UdpHandle,
    -- this computer's IPv4 address on its default route, or nil when there is none.
    local_ip: () -> string?,
  },
  -- permission: exec
  pipe: {
    open: (name: string, options: { size: number? }?) -> PipeHandle,
  },
  -- paths are relative to the script directory; absolute paths are rejected
  file: {
    read: (path: string) -> string,
    read_bytes: (path: string) -> string,
    write: (path: string, content: string) -> (),
    append: (path: string, content: string) -> (),
    exists: (path: string) -> boolean,
    delete: (path: string) -> boolean,
    -- nil path lists the script's own directory
    list: (path: string?) -> { string },
    mkdir: (path: string) -> boolean,
    -- recursive; raises when the directory does not exist or cannot be removed.
    rmdir: (path: string) -> boolean,
    copy: (src: string, dst: string) -> (),
    move: (src: string, dst: string) -> (),
    read_json: (path: string) -> any,
    write_json: (path: string, value: any) -> (),
    script_dir: () -> string,
    size: (path: string) -> number,
    time: (path: string) -> number,
    is_dir: (path: string) -> boolean,
    is_file: (path: string) -> boolean,
  },
  audio: {
    beep: () -> (),
    play: (path: string, options: PlayOptions?) -> SoundHandle,
    stop_all: () -> (),
    set_master_volume: (vol: number) -> (),
    get_master_volume: () -> number,
  },
  -- every dialog call is coroutine-only: it yields until the dialog closes
  -- and errors outside rb.run. the pickers return nil on cancel.
  dialog: {
    message: (text: string, options: DialogMessageOptions?) -> (),
    confirm: (text: string, options: DialogMessageOptions?) -> boolean,
    open_file: (options: DialogFileOptions?) -> string?,
    open_dir: (options: DialogFileOptions?) -> string?,
    save_file: (options: DialogFileOptions?) -> string?,
  },
  -- limited by clipboard:read, clipboard:write, clipboard:none
  clipboard: {
    get: () -> string?,
    set: (text: string) -> (),
  },
  script: {
    exit: (reason: string?) -> (),
    reload: () -> (),
  },
  regex: {
    is_match: (text: string, pattern: string) -> boolean,
    find: (text: string, pattern: string) -> RegexMatch?,
    find_all: (text: string, pattern: string) -> { RegexMatch },
    replace: (text: string, pattern: string, replacement: string) -> string,
    replace_all: (text: string, pattern: string, replacement: string) -> string,
    split: (text: string, pattern: string) -> { string },
  },
  config: {
    parse_toml: (text: string) -> { [string]: any },
    to_toml: (value: { [string]: any }) -> string,
    read_toml: (path: string) -> { [string]: any },
    write_toml: (path: string, value: { [string]: any }) -> (),
  },
  hash: {
    md5: (data: string) -> string,
    sha1: (data: string) -> string,
    sha256: (data: string) -> string,
    sha512: (data: string) -> string,
    crc32: (data: string) -> number,
    hmac: (algo: string, key: string, data: string) -> string,
  },
  codec: {
    base64: (data: string) -> string,
    base64_decode: (str: string) -> string,
    hex: (data: string) -> string,
    hex_decode: (str: string) -> string,
  },
  env: {
    get: (name: string) -> string?,
    -- Requires the 'exec' permission.
    set: (name: string, value: string) -> (),
    home: () -> string?,
    config: () -> string?,
    data: () -> string?,
    desktop: () -> string?,
    documents: () -> string?,
    downloads: () -> string?,
    appdata: () -> string?,
    temp: () -> string?,
  },
  -- Windows only
  registry: {
    read: (key_path: string, value_name: string) -> string | number,
    write: (key_path: string, type: string, value_name: string, value: any) -> (),
    delete_value: (key_path: string, value_name: string) -> (),
    delete_key: (key_path: string) -> (),
    create_key: (key_path: string) -> (),
  },
  -- Rebind Pro; require("@rebind/pro") returns rb
  ai: RbAi,
  phone: RbPhone,
  -- drawing on screen over every app, games included (Windows and macOS)
  overlay: RbOverlay,
}

-- v1 names
-- The names every Rebind version accepts. They keep working.

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
  -- exact in Windows and macOS software mode; on a Rebind Link it moves,
  -- rereads the cursor and corrects until within 2 px (about 150 ms at
  -- most), waiting with Sleep in Run and blocking elsewhere. With ms it
  -- glides there over ms on an eased path; a duration needs Run or Async.
  MoveTo: (x: number, y: number, ms: number?) -> (),
  Scroll: (amount: number) -> (),
  -- deprecated: the mode is stored but no longer changes MoveTo
  SetMouseMode: (mode: string) -> (),
  GetMouseMode: () -> string,
  -- keyboard HID usage for a key name, or nil (media keys return nil). Down,
  -- Up, Press and Combo also accept "usage:N" (decimal or 0x hex, 0x04-0xE7).
  Usage: (name: string) -> number?,
  -- set the whole joypad state (last write wins across scripts). Needs a
  -- Rebind Link whose USB profile has a joypad; raises otherwise. Keyboard
  -- and mouse calls raise the same way when the profile leaves them out.
  -- Down, Up, Press and Combo also press controller buttons ("PadA").
  Joypad: (state: JoypadState?) -> (),
  -- hold one controller axis (LeftX..RightY -1..1, LT/RT 0..1) until set
  -- again or reset; it wins over a captured controller's value
  Axis: (name: string, value: number) -> (),
  -- drop what scripts set, keeping what a captured controller holds; the
  -- relay also does this when a script stops or errors
  JoypadReset: () -> (),
}

-- input namespace

declare Input: {
  IsDown: (code: string) -> boolean,
  -- a controller axis by name, 0 at rest
  GetAxis: (name: string) -> number,
  -- the devices Rebind has identified (3.12.0); empty in software mode
  Devices: () -> { InputDevice },
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
  __call: (self: any, key: string, config: ((device: InputDevice?) -> boolean?) | BindConfig) -> BindHandle,
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
  -- the saved-macro format: a `macro=true` modeline, then `return` of the
  -- actions. require() of a saved macro returns the actions.
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

declare Process: {
  Exists: (name: string) -> number?,
  List: (name: string?) -> { ProcessEntry },
  Kill: (pid: number) -> boolean,
}

-- screen namespace

-- pixel reads are limited by a screen:target or screen:none permission entry

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
  Move: (handle: number?, x: number?, y: number?, width: number?, height: number?) -> (),
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
-- Control). Activate focuses a running app and never launches one; start an
-- app with System.ExecDetached (permission: exec). macOS: names match
-- case-insensitively by app display name; Activate needs Accessibility;
-- Quit/IsHidden drive an AppleEvent and prompt for macOS Automation
-- permission on first use; Quit leaves an app that is not running alone.
-- Windows: names are executable names (case-insensitive, ".exe" optional);
-- Quit closes its windows; Hide/IsHidden raise.

declare App: {
  Front: () -> AppInfo?,
  IsFront: (name: string) -> boolean,
  IsRunning: (name: string) -> boolean,
  IsHidden: (name: string) -> boolean,
  Activate: (name: string) -> (),
  Hide: (name: string) -> (),
  Quit: (name: string) -> (),
}

-- net namespace (permission: net, or net:<host> for the client calls and WSConnect)

declare Net: {
  Get: (url: string, headers: { [string]: string }?, options: HttpOptions?) -> HttpResponse,
  Post: (url: string, body: string, headers: { [string]: string }?, options: HttpOptions?) -> HttpResponse,
  Put: (url: string, body: string, headers: { [string]: string }?, options: HttpOptions?) -> HttpResponse,
  Patch: (url: string, body: string, headers: { [string]: string }?, options: HttpOptions?) -> HttpResponse,
  Delete: (url: string, headers: { [string]: string }?, options: HttpOptions?) -> HttpResponse,
  Head: (url: string, headers: { [string]: string }?, options: HttpOptions?) -> HttpResponse,
  Request: (options: HttpRequestOptions) -> HttpResponse,
  Listen: (port: number, handler: (request: HttpRequest) -> HttpResponseSpec | string) -> ServerHandle,
  WSListen: (port: number, handlers: WsListenHandlers, options: { host: string? }?) -> WsServerHandle,
  WSConnect: (url: string, handlers: WsConnectHandlers) -> WsConnectHandle,
  -- bind a UDP socket; handler receives each datagram's raw bytes and sender.
  UDPListen: (bindIp: string, port: number, handler: (data: string, ip: string, port: number) -> ()) -> UdpHandle,
  -- this computer's IPv4 address on its default route, or nil when there is none.
  LocalIP: () -> string?,
}

-- pipe namespace (permission: exec)

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
  -- recursive; raises when the directory does not exist or cannot be removed.
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

declare Audio: {
  Beep: () -> (),
  Play: (path: string, options: PlayOptions?) -> SoundHandle,
  StopAll: () -> (),
  SetMasterVolume: (vol: number) -> (),
  GetMasterVolume: () -> number,
}

-- dialog namespace

-- every Dialog call is coroutine-only: it yields until the dialog closes and
-- errors outside Run(). the file and folder pickers return nil on cancel.
declare Dialog: {
  Message: (text: string, options: DialogMessageOptions?) -> (),
  Confirm: (text: string, options: DialogMessageOptions?) -> boolean,
  OpenFile: (options: DialogFileOptions?) -> string?,
  OpenDir: (options: DialogFileOptions?) -> string?,
  SaveFile: (options: DialogFileOptions?) -> string?,
}

-- clipboard namespace (limited by clipboard:read, clipboard:write, clipboard:none)

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
  -- Requires the 'exec' permission.
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

-- hooks: declare these as global functions in your script.
-- uncomment the ones you use; the runtime calls them when events occur.

-- declare function OnStart(): ()
-- declare function OnStop(): ()
-- declare function OnFocus(window: WindowInfo): ()
-- declare function OnBlur(window: WindowInfo): ()
-- declare function OnTick(dtMs: number): ()  -- ms elapsed since the previous OnTick (0 on the first)
-- declare function OnDown(key: string, device: InputDevice?): boolean?
-- declare function OnUp(key: string, durationMs: number, device: InputDevice?): boolean?
-- declare function OnMove(dx: number, dy: number, device: InputDevice?): boolean?  -- return value only used with mouse_block=true (hardware mode only)
-- declare function OnScroll(delta: number, device: InputDevice?): boolean?
-- declare function OnScrollH(delta: number): boolean?
-- declare function OnAxis(axis: string, value: number, device: InputDevice?): boolean?  -- hardware mode only
-- declare function OnInputDown(key: string, device: InputDevice?): ()
-- declare function OnInputUp(key: string, durationMs: number, device: InputDevice?): ()
-- declare function OnInputMove(dx: number, dy: number, device: InputDevice?): ()
-- declare function OnInputScroll(delta: number, device: InputDevice?): ()
-- declare function OnError(message: string): ()
-- declare function OnReload(): ()
