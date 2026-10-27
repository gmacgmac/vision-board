// A board's controls, paused while the board is locked (N40 ruling 4, api.md 139): shared by the
// node and region elements, which pass their own list. A paused control stays where it is and in the
// tab order, aria-disabled, so the person still sees what they could do and hears that they can't;
// `data-paused` gives it the quiet look (paused.css). A press still reaches the page, which says why
// (board/boards/lock-flow.ts). A control that is aria-disabled for a reason of its own (`keep`) keeps it
// when the board is unlocked. The flag is never in a list: it stays usable. Browser only.

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
