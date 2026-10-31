// What the page and the chat panel (chat-panel.ts) tell each other: what the page gives it (`ChatPanelDeps`)
// and what it answers (`ChatPanel`). Split out of chat-panel.ts, which re-exports them; import them from there.
import type { ChatBridge } from './chat-bridge.ts';
import type { NewsHost } from './chat-news.ts';
import type { ChatView } from './chat-view.ts';

/** With `NewsHost` (the workAlongside flag): the agent's replies not seen (chat-news.ts). */
export interface ChatPanelDeps extends NewsHost {
  bridge: ChatBridge;
  /** A board's title, for change chips. */
  boardName(id: string): string;
  /** Whether board `id` is archived: its chat takes no message (N39 ruling 3). */
  archived?(id: string): boolean;
  confirm(heading: string, body: string, confirm: string): Promise<boolean>;
  toast(text: string, tone?: 'info' | 'error'): void;
  /** Open the sidebar; resolves once it shows. */
  open(): Promise<void>;
  /** The drawing's load (`load`): loading while it comes, ready once drawn, error when it did not come. */
  view(state: 'loading' | 'ready' | 'error'): void;
}

export type ChatViewLoader = () => Promise<{ mountChatView(panel: HTMLElement): ChatView }>;

export interface ChatPanel {
  /** The open board ('' a folder with no board; null before the page knows), and whether a past version of it shows. */
  show(board: string | null, past: boolean): void;
  /** Load the drawing if it has not come yet (a no-op once it has): true once it is drawn, false when it did not come. */
  load(): Promise<boolean>;
  focus(): void;
  /** The sidebar opened: with replies the person has not seen, the feed goes to the latest. */
  opened(): void;
  destroy(): void;
}
