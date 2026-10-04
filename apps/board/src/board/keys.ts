// Keyboard: every pointer action has a key (project rule 5). Shortcuts come from the action
// registry, so a new action with a key works here without changes.
import type { ActionId } from '../../../../packages/format/src/index.ts';
import { ACTIONS } from '../../../../packages/actions/src/index.ts';

export interface KeyHandlers {
  act(id: string, action: ActionId): void;
  nudge(id: string, dx: number, dy: number): void;
  unpin(id: string): void;
  step(from: string | null, dir: 1 | -1): void;
  fit(): void;
  toggleHide(): void;
  zoom(factor: number): void;
  escape(): void;
}

const NUDGE = 16;
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
};
const BY_KEY = new Map(
  Object.values(ACTIONS).filter((a) => a.key && a.onItem).map((a) => [a.key!, a.id]),
);

/** Listens on the document; returns the function that stops listening. */
export function bindKeys(h: KeyHandlers): () => void {
  const onKey = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (e.defaultPrevented || target.closest('input, textarea, select, dialog')) return;
    if (e.key === 'Escape') return h.escape();
    if (e.metaKey || e.ctrlKey) return;
    const id = target.closest<HTMLElement>('vb-node')?.dataset.id ?? null;
    const arrow = ARROWS[e.key];
    if (arrow && id && e.altKey) {
      e.preventDefault();
      return h.nudge(id, arrow[0] * NUDGE * (e.shiftKey ? 4 : 1), arrow[1] * NUDGE * (e.shiftKey ? 4 : 1));
    }
    const key = e.key.toLowerCase();
    if (e.altKey) return;
    if (key === 'j' || (id && (e.key === 'ArrowDown' || e.key === 'ArrowRight'))) {
      e.preventDefault();
      return h.step(id, 1);
    }
    if (key === 'k' || (id && (e.key === 'ArrowUp' || e.key === 'ArrowLeft'))) {
      e.preventDefault();
      return h.step(id, -1);
    }
    if (id && BY_KEY.has(key)) {
      e.preventDefault();
      return h.act(id, BY_KEY.get(key)!);
    }
    if (id && key === 'r') return h.unpin(id);
    if (key === 'f') return h.fit();
    if (key === 'h') return h.toggleHide();
    if (key === '+' || key === '=') return h.zoom(1.2);
    if (key === '-') return h.zoom(1 / 1.2);
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}
