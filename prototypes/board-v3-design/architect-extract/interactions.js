// Extracted verbatim from prototypes/architect/app/index.html, 2026-10-02. Reference only.
// Depends on Architect's global state S, $(), stage, world, msgEl; not runnable on its own.
// Sections: icons (337-378), annotations/selection/view/selbar/note popover/pointer+keyboard (613-835), composer chips (879-908).

// ---------- icons (source 337-378) ----------
const ICONS = {
  signal: '<circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  cloud: '<path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 0 0 4.5 12.5 3.5 3.5 0 0 0 6 19z"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  broadcast: '<circle cx="12" cy="10" r="2"/><path d="M12 12v9M8 6.5a5 5 0 0 0 0 7M16 6.5a5 5 0 0 1 0 7"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1 20 20M8.1 15.9 20 4"/>',
  doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h6M9 16h6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6"/>',
  tv: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="m8 2 4 4 4-4"/>',
  server: '<rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  box: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  dollar: '<path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  cc: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10.5 10a2 2 0 1 0 0 4M17 10a2 2 0 1 0 0 4"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  // UI
  send: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
};
const icon = (name, size = 16) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.box}</svg>`;

function renderAnnotations() {
  let svg = '';
  const pins = [];
  S.notes.forEach((n, i) => {
    if (n.region) {
      const r = n.region;
      svg += `<rect class="region" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="10"/>`;
      pins.push({ i, x: r.x - 10, y: r.y - 14 });
    } else {
      n.nodes.forEach((id) => { const p = S.lay?.pos.get(id); if (p) pins.push({ i, x: p.x + p.w - 14, y: p.y - 14 }); });
    }
  });
  $('#overlay').innerHTML = svg;
  const cards = $('#cards');
  cards.querySelectorAll('.pin').forEach((el) => el.remove());
  cards.insertAdjacentHTML('beforeend', pins.map((p) => `<button class="pin" type="button" data-note="${p.i}" style="transform: translate(${p.x}px, ${p.y}px)" aria-label="Note ${p.i + 1}">${p.i + 1}</button>`).join(''));
}

function updateSelection() {
  document.querySelectorAll('#cards .card').forEach((el) => el.classList.toggle('is-sel', S.selection.has(el.dataset.id)));
  renderSide(); renderComposer(); updateSelbar();
}

// ---------- view transform ----------
function applyView() {
  const { x, y, k } = S.view;
  world.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
  stage.style.backgroundSize = `${22 * k}px ${22 * k}px`;
  stage.style.backgroundPosition = `${x}px ${y}px`;
  updateSelbar(); positionPop();
}
function fitView() {
  const b = S.lay?.bounds;
  const W = stage.clientWidth, Hh = stage.clientHeight - ($('.dock')?.offsetHeight || 0);
  if (!b || !b.w) { S.view = { x: 40, y: 80, k: 1 }; applyView(); return; }
  const pad = 48;
  const k = Math.max(.3, Math.min(1.05, (W - pad * 2) / b.w, (Hh - pad * 2) / b.h));
  S.view = { k, x: (W - b.w * k) / 2 - b.x * k, y: (Hh - b.h * k) / 2 - b.y * k };
  applyView();
}
function zoomAt(f, cx, cy) {
  const { x, y, k } = S.view;
  const nk = Math.max(.25, Math.min(2.2, k * f));
  S.view = { k: nk, x: cx - (cx - x) * (nk / k), y: cy - (cy - y) * (nk / k) };
  applyView();
}
const toScreen = (wx, wy) => ({ x: wx * S.view.k + S.view.x, y: wy * S.view.k + S.view.y });
const toWorld = (sx, sy) => ({ x: (sx - S.view.x) / S.view.k, y: (sy - S.view.y) / S.view.k });

// ---------- selection bar & note popover ----------
function selBox(ids) {
  const rs = [...ids].map((id) => S.lay?.pos.get(id)).filter(Boolean);
  if (!rs.length) return null;
  const x1 = Math.min(...rs.map((r) => r.x)), y1 = Math.min(...rs.map((r) => r.y));
  const x2 = Math.max(...rs.map((r) => r.x + r.w)), y2 = Math.max(...rs.map((r) => r.y + r.h));
  const a = toScreen(x1, y1), b = toScreen(x2, y2);
  return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
}
function updateSelbar() {
  const bar = $('#selbar');
  const show = S.selection.size && !S.editing && !S.busy && isLatest();
  if (!show) { bar.hidden = true; return; }
  const box = selBox(S.selection);
  if (!box) { bar.hidden = true; return; }
  bar.innerHTML = `<span>${S.selection.size} selected</span><button class="btn btn-sm" type="button" data-act="note">${icon('plus', 14)}Add note</button>`;
  bar.hidden = false;
  const W = stage.clientWidth;
  bar.style.left = `${Math.max(8, Math.min(W - bar.offsetWidth - 8, box.x + box.w / 2 - bar.offsetWidth / 2))}px`;
  bar.style.top = `${Math.max(8, box.y - bar.offsetHeight - 12)}px`;
}

function labelOf(id) {
  const n = S.vg?.nodes.find((x) => x.id === id);
  if (!n) return id;
  if (!n.label) return n.prim?.name || id;
  const parent = n.parent ? S.plan.nodes.find((p) => p.id === n.parent) : null;
  return parent ? `${parent.label} › ${n.label}` : n.label;
}
function targetOf(id) {
  const n = S.vg?.nodes.find((x) => x.id === id);
  return n ? { id, type: n.type, label: labelOf(id) } : { id };
}

function openNote(draft) {
  // draft: { index?: number, nodes: [], region: null | {x,y,w,h}, text }
  S.editing = draft;
  const pop = $('#pop');
  const names = draft.nodes.map(labelOf);
  pop.innerHTML = `
    <div class="head">${draft.index != null ? `Note ${draft.index + 1} on` : 'Note on'} <b>${esc(names.join(', ') || 'this area')}</b></div>
    <textarea id="noteText" placeholder="Say or type what should change here…">${esc(draft.text || '')}</textarea>
    <div class="row">
      ${draft.index != null ? `<button class="btn btn-sm" type="button" data-act="del-note">Remove</button>` : ''}
      <span class="hint">Enter to add · Esc to cancel</span>
      <button class="btn btn-sm" type="button" data-act="cancel-note">Cancel</button>
      <button class="btn btn-sm btn-primary" type="button" data-act="save-note">${draft.index != null ? 'Save' : 'Add note'}</button>
    </div>`;
  pop.hidden = false;
  positionPop();
  updateSelbar();
  const ta = $('#noteText');
  ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
}
function positionPop() {
  const pop = $('#pop');
  if (pop.hidden || !S.editing) return;
  const d = S.editing;
  let box = d.region ? (() => { const a = toScreen(d.region.x, d.region.y), b = toScreen(d.region.x + d.region.w, d.region.y + d.region.h); return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }; })() : selBox(d.nodes);
  if (!box) box = { x: stage.clientWidth / 2 - 160, y: 80, w: 0, h: 0 };
  const W = stage.clientWidth, Hh = stage.clientHeight - ($('.dock')?.offsetHeight || 0), pw = pop.offsetWidth, ph = pop.offsetHeight;
  let left = box.x + box.w + 14, top = box.y;
  if (left + pw > W - 8) left = Math.max(8, box.x - pw - 14);
  if (left < 8) { left = Math.max(8, Math.min(W - pw - 8, box.x)); top = box.y + box.h + 12; }
  top = Math.max(8, Math.min(Hh - ph - 8, top));
  pop.style.left = `${left}px`; pop.style.top = `${top}px`;
}
function closeNote() { S.editing = null; $('#pop').hidden = true; updateSelbar(); }
function saveNote() {
  const d = S.editing; if (!d) return;
  const text = $('#noteText').value.trim();
  if (!text) { closeNote(); return; }
  if (d.index != null) S.notes[d.index].text = text;
  else S.notes.push({ id: `a${Date.now().toString(36)}`, text, nodes: d.nodes, region: d.region || null });
  closeNote();
  S.selection.clear();
  renderAnnotations(); updateSelection();
  msgEl.focus();
}
function removeNote(i) { S.notes.splice(i, 1); closeNote(); renderAnnotations(); renderSide(); renderComposer(); }

// ---------- pointer & keyboard ----------
let drag = null, spaceDown = false;
stage.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.note-pop, .selbar, .stage-tools, .banner, .empty-card')) return;
  const pin = e.target.closest('.pin');
  if (pin) { const i = +pin.dataset.note; openNote({ index: i, nodes: S.notes[i].nodes, region: S.notes[i].region, text: S.notes[i].text }); return; }
  const exp = e.target.closest('[data-expand]');
  if (exp) { toggleExpand(exp.dataset.expand); return; }
  const card = e.target.closest('.card');
  if (card && !spaceDown && e.button === 0) {
    const id = card.dataset.id;
    if (e.shiftKey || e.metaKey || e.ctrlKey) { S.selection.has(id) ? S.selection.delete(id) : S.selection.add(id); }
    else S.selection = new Set([id]);
    if (S.editing) closeNote();
    updateSelection();
    return;
  }
  const pan = e.button === 1 || spaceDown || e.altKey || !isLatest() || S.busy;
  drag = { mode: pan ? 'pan' : 'lasso', sx: e.clientX, sy: e.clientY, vx: S.view.x, vy: S.view.y, moved: false };
  if (pan) stage.classList.add('is-panning');
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
  if (drag.mode === 'pan') { S.view.x = drag.vx + dx; S.view.y = drag.vy + dy; applyView(); return; }
  if (!drag.moved) return;
  const r = stage.getBoundingClientRect();
  const x = Math.min(e.clientX, drag.sx) - r.left, y = Math.min(e.clientY, drag.sy) - r.top;
  Object.assign($('#lasso').style, { left: `${x}px`, top: `${y}px`, width: `${Math.abs(dx)}px`, height: `${Math.abs(dy)}px` });
  $('#lasso').hidden = false;
});
stage.addEventListener('pointerup', (e) => {
  if (!drag) return;
  const d = drag; drag = null;
  stage.classList.remove('is-panning');
  $('#lasso').hidden = true;
  if (d.mode === 'lasso' && d.moved) {
    const r = stage.getBoundingClientRect();
    const a = toWorld(Math.min(e.clientX, d.sx) - r.left, Math.min(e.clientY, d.sy) - r.top);
    const b = toWorld(Math.max(e.clientX, d.sx) - r.left, Math.max(e.clientY, d.sy) - r.top);
    const region = { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
    const hits = [...S.lay.pos.entries()].filter(([, p]) => p.x < b.x && p.x + p.w > a.x && p.y < b.y && p.y + p.h > a.y).map(([id]) => id);
    if (!hits.length) { toast('Drag around one or more boxes to comment on that area.'); return; }
    S.selection = new Set(hits); updateSelection();
    openNote({ nodes: hits, region });
  } else if (!d.moved && d.mode === 'lasso') {
    if (S.editing) closeNote();
    if (S.selection.size) { S.selection.clear(); updateSelection(); }
  }
});
stage.addEventListener('dblclick', (e) => {
  const card = e.target.closest('.card');
  if (!card || !isLatest() || S.busy) return;
  S.selection = new Set([card.dataset.id]); updateSelection();
  openNote({ nodes: [card.dataset.id], region: null });
});
stage.addEventListener('wheel', (e) => {
  e.preventDefault();
  const r = stage.getBoundingClientRect();
  if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top);
  else { S.view.x -= e.deltaX; S.view.y -= e.deltaY; applyView(); }
}, { passive: false });

document.addEventListener('keydown', (e) => {
  if (e.target.id === 'noteText') {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNote(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeNote(); }
    return;
  }
  if (isTyping(e.target)) return;
  if (e.code === 'Space') { spaceDown = true; stage.classList.add('is-panning'); e.preventDefault(); }
  else if (e.key === 'f' || e.key === 'F') fitView();
  else if ((e.key === 'n' || e.key === 'N') && S.selection.size && isLatest()) { e.preventDefault(); openNote({ nodes: [...S.selection], region: null }); }
  else if (e.key === 'Escape') { if (S.editing) closeNote(); else { S.selection.clear(); updateSelection(); } }
});
document.addEventListener('keyup', (e) => { if (e.code === 'Space') { spaceDown = false; if (!drag) stage.classList.remove('is-panning'); } });

document.addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'note') openNote({ nodes: [...S.selection], region: null });
  else if (act === 'save-note') saveNote();
  else if (act === 'cancel-note') closeNote();
  else if (act === 'del-note') removeNote(S.editing.index);
  else if (act === 'latest') show(S.latest, { fit: false });
  else if (act === 'approve') approve();
  else if (act === 'expand') toggleExpand(e.target.closest('[data-act]').dataset.id);
  const z = e.target.closest('[data-zoom]')?.dataset.zoom;
  if (z === '0') fitView();
  else if (z) zoomAt(z === '1' ? 1.2 : 1 / 1.2, stage.clientWidth / 2, stage.clientHeight / 2);
});


// ---------- composer ----------
function autosize() { msgEl.style.height = 'auto'; msgEl.style.height = `${Math.min(180, msgEl.scrollHeight)}px`; }
function renderComposer() {
  const ctx = $('#cmpCtx');
  const parts = [];
  if (S.notes.length) {
    parts.push('<span class="cmp-label">Notes</span>');
    S.notes.forEach((n, i) => parts.push(`<span class="ctx-chip"><span class="n">${i + 1}</span><span class="t">${esc(n.text)}</span><button type="button" data-rm-note="${i}" aria-label="Remove note">${icon('x', 12)}</button></span>`));
  }
  if (S.selection.size) {
    parts.push('<span class="cmp-label">Selected</span>');
    parts.push(`<span class="ctx-chip plain"><span class="t">${esc([...S.selection].map(labelOf).join(', '))}</span><button type="button" data-clear-sel aria-label="Clear selection">${icon('x', 12)}</button></span>`);
  }
  ctx.innerHTML = parts.join('');
  ctx.hidden = !parts.length;
  $('#cmpMode').innerHTML = `${icon('sparkle', 15)}Architect`;
  const can = isLatest() && !S.busy && (msgEl.value.trim() || S.notes.length);
  $('#send').disabled = !can;
  msgEl.disabled = S.busy || !isLatest();
  msgEl.placeholder = !isLatest() ? `Viewing v${S.viewing}. Go back to the latest version to make changes.` : S.plan.nodes.length ? 'Say what to change, or add notes on the diagram and send…' : 'Describe a workflow…';
}
$('#cmpCtx').addEventListener('click', (e) => {
  const rm = e.target.closest('[data-rm-note]');
  if (rm) { removeNote(+rm.dataset.rmNote); return; }
  if (e.target.closest('[data-clear-sel]')) { S.selection.clear(); updateSelection(); }
});
msgEl.addEventListener('input', () => { autosize(); renderComposer(); });
msgEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
$('#send').innerHTML = icon('send', 18);
$('#send').addEventListener('click', send);
