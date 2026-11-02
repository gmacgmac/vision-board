// Update in place (docs/principles.md § Component model): make what an element drew match the markup
// its template makes again, by changing attributes and text, so the nodes, and focus in them, stay.
// Nodes are matched by position and kind; where the two differ in number or kind the new ones go in.
// A picker shows the option its markup selects, even after the person chose another. Browser only.

const same = (a: Node, b: Node | undefined): boolean => a.nodeType === b?.nodeType && a.nodeName === b.nodeName;

/** Make the nodes `now` match `next` in place; false, with nothing changed, when they differ in number or kind. */
export function morphNodes(now: readonly Node[], next: readonly Node[]): boolean {
  if (now.length !== next.length || !now.every((n, i) => same(n, next[i]))) return false;
  now.forEach((n, i) => {
    const to = next[i]!;
    if (n instanceof Element) morph(n, to as Element);
    else if (n.nodeValue !== to.nodeValue) n.nodeValue = to.nodeValue;
  });
  return true;
}

/** Make `now` match `next`, an element of the same tag: its attributes, then its children. */
export function morph(now: Element, next: Element): void {
  for (const a of [...now.attributes]) if (!next.hasAttribute(a.name)) now.removeAttribute(a.name);
  for (const a of [...next.attributes]) if (now.getAttribute(a.name) !== a.value) now.setAttribute(a.name, a.value);
  if (!morphNodes([...now.childNodes], [...next.childNodes])) now.replaceChildren(...next.childNodes);
  if (now instanceof HTMLSelectElement) now.selectedIndex = Math.max(0, [...now.options].findIndex((o) => o.defaultSelected));
}
