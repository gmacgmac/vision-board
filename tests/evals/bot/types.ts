// The eval's shapes: what one run records (from what the bot did: the host's log of its calls, the CLI's stream of its
// tool uses and chat, the ledger and the board folder after it), and what a scenario is: setup, turns, checks, and the
// scripted fake bot that stands in for the model under `--dry`.

/** One board tool call as the host's door saw it. `input` is what the bot asked, before any clamp. */
export interface Call {
  turn: number;
  name: string;
  input: Record<string, any>;
  clamped?: { wait: number; to: number };
  ms: number;
  isError: boolean;
  text: string;
  timedOut?: boolean;
}

/** One tool use in the CLI's stream (any tool: the board's, `Write`, or one it was never given). */
export interface Use { name: string; input: any; isError?: boolean; result?: string }

/** The CLI's own end of a turn (its `result` line). */
export interface TurnEnd { subtype: string; numTurns: number; costUsd: number; isError: boolean }

export interface TurnRecord {
  /** What the host sent: the person's words and the Send's message, as one message. */
  message: string;
  /** Every block of text the bot wrote this turn, joined: what the person reads in the chat. */
  text: string;
  uses: Use[];
  end: TurnEnd | null;
}

export interface Exit {
  code: number | null;
  signal: string | null;
  /** Killed by our wall clock. */
  killed: boolean;
  seconds: number;
  /** Killed by the stall watchdog: no stream line for `STALL_MS` while a turn was open. */
  stalled?: boolean;
  /** Ended without an answer for every turn, and not by our kill or a CLI cap, or stalled: worth one retry. */
  crashed: boolean;
}

export interface RunRecord {
  scenario: string;
  attempt: number;
  /** The board folder (the engine's data folder) as the run left it; a copy, under the report. */
  dir: string;
  turns: TurnRecord[];
  calls: Call[];
  ledger: { seq: number; type: string; [k: string]: any }[];
  /** Numbers the setup and the person's steps found (a note's `seq`, ...), for the checks. */
  facts: Record<string, number | string>;
  exit: Exit;
  model: string | null;
  /** What the pass-through's server said at `initialize` / `server/discover`. */
  instructions: string | null;
  /** The engine's answer for a picture path (status), as a host's `imageRoute` would serve it. */
  imageStatus: Record<string, number>;
  costUsd: number;
  /** A harness step that failed (the person's, a setup's): the run stopped there, and is not retried. */
  problem: string | null;
}

export interface Verdict { pass: boolean; evidence: string }
export interface Check { id: string; says: string; run(r: RunRecord): Verdict }

/** The person, at the host's door for people (engine.route with the person as caller). */
export interface Person {
  /** ✓ (`ack`), ✗ (`drop`) or Later on card `n`. */
  mark(board: string, n: number, mark: 'ack' | 'drop' | 'later'): Promise<void>;
  /** Which way the board's flows run, from its header (a `direction` act with no container). */
  direction(board: string, direction: 'across' | 'down'): Promise<void>;
  /** A note on card `n`; answers its `seq`. */
  note(board: string, n: number, text: string): Promise<number>;
  /** Send: the answers chip resolved as a host does, and the Send recorded; answers the message's text. */
  send(board: string): Promise<string>;
  /** A board the person makes, as the board page does (`put_board`): no agent made it. */
  board(board: string, title: string): Promise<void>;
}

/** What setup and turns get: the bot's own tools as the host's earlier turn (not logged as the bot's), the person,
 * and the facts to fill. */
export interface Stage {
  dir: string;
  /** The bot's working folder, where a file the person names for it can sit. */
  cwd: string;
  tool(name: string, input: Record<string, unknown>): Promise<any>;
  person: Person;
  facts: Record<string, number | string>;
  /** The board the bot last wrote on this run (its own name for it), if it wrote one. */
  botBoard(): string | undefined;
  /** Open the ledger read-only (true) or for writing (false), as a host's own control does (`readOnly`, plugin.md). */
  readOnly(on: boolean): void;
  /** Standalone: open ledger `name` of the folder as the person does (`open_project`), made when it has none. */
  ledger(name: string): Promise<void>;
}

/** Where the bot runs: the plugin's host (eval.ts `pluginHost`, over host.ts) or the standalone board server
 * (standalone.ts). The eval's loop and the checks see only this. */
export interface BotHost {
  /** The board folder: the engine's data folder, or the open ledger's folder (`.visionboard/main`). */
  dir: string;
  /** The bot's working folder. */
  cwd: string;
  /** The bot's `vision-board` MCP server entry. */
  mcp: { command: string; args: string[]; env: Record<string, string> };
  /** The bot's instructions (a file), the line appended to them, its built-in tools, the folders it may reach, and the
   * skill's folder (its `references/`), which the line names as a client names a skill's base directory. */
  bot: { skill: string; prompt: string; tools: string; addDirs: string[]; skillDir: string };
  /** The bot's board tool calls: logged at the door as they happen, or (standalone) read from its stream. */
  calls: Call[];
  seen: { instructions: string | null };
  tool: Stage['tool'];
  person: Person;
  setReadOnly: Stage['readOnly'];
  openLedger: Stage['ledger'];
  setTurn(n: number): void;
  /** After the run: what the stream showed, for a host that has no door. */
  record(turns: TurnRecord[]): void;
  ledger(): Promise<RunRecord['ledger']>;
  image(path: string): Promise<number>;
  close(): Promise<void>;
}

/** A reference file beside the skill (`references/<name>.md`; skills/vision-board/source/references/). */
export type Reference = 'layouts' | 'architecture' | 'timeline' | 'handover' | 'apps' | 'files';

/** One message from the host: the person's words, and/or what the person did on the board, then their Send. */
export interface Turn {
  /** The person's words; from the stage when they name what setup made (a file's path). */
  say?: string | ((s: Stage) => string);
  act?: (s: Stage) => Promise<void>;
  /** The board whose Send goes with the message. */
  send?: string | ((s: Stage) => string);
}

/** The scripted bot's side of one turn (`--dry`). */
export interface FakeBot {
  dir: string;
  message: string;
  /** The board tools it was given (`join` only standalone), so one script plays both hosts. */
  tools: string[];
  call(name: string, input: Record<string, unknown>): Promise<any>;
  write(file: string, text: string): void;
  /** Read the skill's reference `name` (`references/<name>.md`), as the model does with its Read tool. */
  read(name: string): void;
  use(name: string, input: unknown): void;
  say(text: string): void;
}
export type FakeTurn = (bot: FakeBot) => Promise<void>;

export interface Scenario {
  id: string;
  title: string;
  setup?: (s: Stage) => Promise<void>;
  turns: Turn[];
  checks: Check[];
  /** Engine flags this scenario runs with, over the eval's (`--flags`): one about a host's switch holds it on. */
  flags?: Record<string, boolean>;
  /** The skill's references this request needs (`need`) and those it may read (`may`); any other read fails
   * `reads-references`, which every scenario gets. Left out: the core is enough, so no reference is read. */
  reads?: { need?: Reference[]; may?: Reference[] };
  /** `good` keeps every rule; `bad` breaks the ones the dry test expects to see fail. */
  fake: { good: FakeTurn[]; bad?: FakeTurn[]; badFails?: string[] };
}
