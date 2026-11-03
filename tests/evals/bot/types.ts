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
  /** Ended without an answer for every turn, and not by our kill or a CLI cap: worth one retry. */
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
  mark(board: string, n: number, mark: 'ack' | 'drop'): Promise<void>;
  /** A note on card `n`; answers its `seq`. */
  note(board: string, n: number, text: string): Promise<number>;
  /** Send: the answers chip resolved as a host does, and the Send recorded; answers the message's text. */
  send(board: string): Promise<string>;
}

/** What setup and turns get: the bot's own tools as the host's earlier turn (not logged as the bot's), the person,
 * and the facts to fill. */
export interface Stage {
  dir: string;
  tool(name: string, input: Record<string, unknown>): Promise<any>;
  person: Person;
  facts: Record<string, number | string>;
  /** The board the bot last wrote on this run (its own name for it), if it wrote one. */
  botBoard(): string | undefined;
  /** Open the ledger read-only (true) or for writing (false), as a host's own control does (`readOnly`, plugin.md). */
  readOnly(on: boolean): void;
}

/** One message from the host: the person's words, and/or what the person did on the board, then their Send. */
export interface Turn {
  say?: string;
  act?: (s: Stage) => Promise<void>;
  /** The board whose Send goes with the message. */
  send?: string | ((s: Stage) => string);
}

/** The scripted bot's side of one turn (`--dry`). */
export interface FakeBot {
  dir: string;
  message: string;
  call(name: string, input: Record<string, unknown>): Promise<any>;
  write(file: string, text: string): void;
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
  /** `good` keeps every rule; `bad` breaks the ones the dry test expects to see fail. */
  fake: { good: FakeTurn[]; bad?: FakeTurn[]; badFails?: string[] };
}
