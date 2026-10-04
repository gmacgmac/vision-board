// Small DOM helpers for the gallery page. Text goes in through textContent, never as markup.
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** A labelled group of samples inside a pattern's section. */
export function group(title: string, note: string | null, ...content: HTMLElement[]): HTMLElement {
  const box = el('div', 'g-group');
  box.append(el('h3', 'g-group-title', title));
  if (note) box.append(el('p', 'g-note', note));
  box.append(...content);
  return box;
}

/** A row of cards. <vb-node> is a list item, so its parent must be a list. */
export function cardList(label: string, ...cards: HTMLElement[]): HTMLElement {
  const list = el('div', 'g-cards');
  list.setAttribute('role', 'list');
  list.setAttribute('aria-label', label);
  list.append(...cards);
  return list;
}
