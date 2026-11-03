// A board's controls, paused while the board is locked (N40 ruling 4, api.md 139) or its ledger read-only (D-085): shared by the
// node and region elements, which pass their own list. A paused control stays where it is and in the
// tab order, aria-disabled, so the person still sees what they could do and hears that they can't;
// `data-paused` gives it the quiet look (paused.css). A press still reaches the page, which says why
// (board/boards/lock-flow.ts); a read-only ledger's controls also carry the reason as their title (`explainPaused`, FE_01). A control that is aria-disabled for a reason of its own (`keep`) keeps it
// when the board is unlocked. The flag is never in a lock's list: it stays usable; read-only pauses it with its own list
// (vb-node.ts `FLAG`). Browser only.

/** Pause, or resume, every control in `root` that matches `selector`. */
export function pauseControls(root: ParentNode, selector: string, on: boolean, keep: (el: Element) => boolean = () => false): void {
  for (const el of root.querySelectorAll(selector)) {
    if (on) {
      el.toggleAttribute('data-paused', true);
      el.setAttribute('aria-disabled', 'true');
    } else if (el.hasAttribute('data-paused')) {
      el.removeAttribute('data-paused');
      if (!keep(el)) el.removeAttribute('aria-disabled');
    }
  }
}

/** Say why the controls in `root` that match `selector` are paused: with a `reason` it is each one's `title` (its own
 * tooltip kept in `data-title-was`, and its name stays as it is); with none the tooltip comes back. A control whose
 * title is rewritten while paused (a card's update) is kept as it then is. */
export function explainPaused(root: ParentNode, selector: string, reason: string | undefined): void {
  for (const el of root.querySelectorAll<HTMLElement>(selector)) {
    if (reason !== undefined) {
      if (el.getAttribute('title') === reason) continue;
      el.dataset.titleWas = el.getAttribute('title') ?? '';
      el.setAttribute('title', reason);
    } else if (el.dataset.titleWas !== undefined) {
      if (el.dataset.titleWas) el.setAttribute('title', el.dataset.titleWas);
      else el.removeAttribute('title');
      delete el.dataset.titleWas;
    }
  }
}
