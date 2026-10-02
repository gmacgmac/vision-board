// Extracted verbatim from prototypes/architect/app/index.html, 2026-10-02. Reference only.
// Card markup (cardHTML 522-546) and the conversation panel with per-version change chips (1027-1089).

function cardHTML(n) {
  const p = n.prim || {}, fam = p.family || 'destination';
  const flag = S.diff.added.has(n.id) ? 'new' : S.diff.changed.has(n.id) ? 'changed' : '';
  const scheduled = n.type === 'channel' && /sched/i.test(n.props?.mode || '');
  const props = Object.entries(n.props || {}).filter(([k, v]) => v != null && String(v).trim() !== '' && k !== 'name' && !(scheduled && k === 'mode'));
  const atts = n.attachments || [];
  const notes = (n.notes || []).slice(0, 3);
  const sub = n.label && n.label.trim().toLowerCase() !== String(p.name || '').toLowerCase() ? n.label : '';
  const sched = scheduled ? `<div class="sched"><div class="sched-bar">${[['live', 3], ['', 2], ['live', 1], ['', 3], ['live', 2]].map(([k, w]) => `<i class="${k}" style="flex:${w}"></i>`).join('')}</div><span>Scheduled · live + VOD</span></div>` : '';
  return `<div class="card fam-${esc(fam)} ${flag ? `is-${flag === 'new' ? 'added' : 'changed'}` : ''} ${S.selection.has(n.id) ? 'is-sel' : ''}" data-id="${esc(n.id)}" style="width:${CARD_W}px">
    <div class="card-head">
      <i class="card-ico">${icon(scheduled ? 'calendar' : p.icon, 18)}</i>
      <div class="card-titles"><b class="card-label">${esc(p.name || n.type)}</b>${sub ? `<span class="card-sub">${esc(sub)}</span>` : ''}</div>
      ${flag ? `<span class="card-flag ${flag}">${flag === 'new' ? 'NEW' : 'CHANGED'}</span>` : ''}
    </div>
    ${sched || props.length || atts.length || notes.length || n.composite ? `<div class="card-body">
      ${sched}
      ${props.length ? `<div class="chips">${props.map(([k, v]) => `<span class="chip" title="${esc(k)}">${esc(v)}</span>`).join('')}</div>` : ''}
      ${atts.length ? `<div class="chips">${atts.map((a) => { const ap = S.prims[a.type]; const detail = Object.values(a.props || {}).filter(Boolean).join(' · '); return `<span class="chip att" title="${esc((ap?.name || a.type) + (detail ? ': ' + detail : ''))}">${icon(ap?.icon || 'tag', 12)}${esc(shortName(ap) || a.type)}</span>`; }).join('')}</div>` : ''}
      ${notes.length ? `<ul class="card-notes">${notes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      ${n.composite ? `<button class="card-expand" type="button" data-expand="${esc(n.id)}">${icon('layers', 13)}Show inside</button>` : ''}
    </div>` : ''}
  </div>`;
}


function versionDiff(v) {
  const cur = S.cache[v], prev = v > 1 ? S.cache[v - 1] : null;
  if (!cur || (v > 1 && !prev)) return null;
  const d = diffPlans(prev || { nodes: [], edges: [] }, cur);
  const lab = (id) => cur.nodes.find((n) => n.id === id)?.label || id;
  return { added: [...d.added].map(lab), changed: [...d.changed].map(lab), removed: d.removed };
}
let fetchingVersions = false;
function youHTML(r) {
  const notes = r.annotations || [];
  return `<div class="msg you"><div class="who">You</div>
    ${r.message ? `<p>${esc(r.message)}</p>` : ''}
    ${notes.length ? `<ul class="msg-notes">${notes.map((n, i) => `<li><span class="n">${i + 1}</span><span>${esc(n.text)}<small>on ${esc((n.targets || []).map((t) => t.label || t.id).join(', ') || (n.nodes || []).join(', '))}</small></span></li>`).join('')}</ul>` : ''}
    ${r.selection?.length ? `<small>Selected: ${esc(r.selection.map(labelOf).join(', '))}</small>` : ''}
  </div>`;
}
function renderConversation() {
  const body = $('#sideBody');
  const items = [], logged = new Set();
  for (const e of S.log) { items.push({ t: Date.parse(e.at) || 0, kind: 'turn', e }); if (e.version) logged.add(e.version); }
  for (const v of S.versions) {
    const t = Date.parse(v.createdAt) || 0;
    if (v.status === 'approved' && !logged.has(v.version)) items.push({ t, kind: 'approved', v });
    else if (!logged.has(v.version)) items.push({ t, kind: 'direct', v });
  }
  items.sort((a, b) => a.t - b.t);
  const need = S.versions.map((v) => v.version).filter((n) => !S.cache[n]);
  if (need.length && !fetchingVersions) {
    fetchingVersions = true;
    Promise.all(need.map((n) => getVersion(n).catch(() => null))).finally(() => { fetchingVersions = false; if (S.tab === 'chat') renderConversation(); });
  }
  const vbtn = (n) => `<button class="vchip sm" type="button" data-v="${n}" aria-current="${n === S.viewing}">v${n}</button>`;
  const html = items.map((it) => {
    if (it.kind === 'approved') return `<div class="sys ok">${icon('check', 13)}Approved as ${vbtn(it.v.version)} · plan of record</div>`;
    if (it.kind === 'direct') return `<div class="sys">${vbtn(it.v.version)} saved straight to the plan files${it.v.summary ? ` · ${esc(it.v.summary)}` : ''}</div>`;
    const e = it.e, tries = e.attempts || [], failed = tries.filter((a) => !a.ok);
    const secs = e.ms ? `${Math.round(e.ms / 1000)}s` : '';
    const probs = [...new Set(failed.flatMap((a) => a.problems || []))];
    let claude;
    if (e.ok) {
      const d = e.version ? versionDiff(e.version) : null;
      const chg = d ? [...d.added.map((l) => `<span class="chg add">+ ${esc(l)}</span>`), ...d.changed.map((l) => `<span class="chg mod">~ ${esc(l)}</span>`), ...d.removed.map((l) => `<span class="chg del">− ${esc(l)}</span>`)].join('') : '';
      claude = `<div class="msg claude"><div class="who">${icon('sparkle', 13)}Claude<span class="meta">${secs}${tries.length > 1 ? ` · ${tries.length} tries` : ''}</span>${e.version ? vbtn(e.version) : ''}</div>
        <p>${esc(e.reply || e.summary || '')}</p>
        ${chg ? `<div class="changes">${chg}</div>` : ''}
        ${probs.length ? `<details class="retry"><summary>${failed.length === 1 ? 'First draft' : `${failed.length} drafts`} broke the rules, fixed before saving</summary><ul>${probs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}
      </div>`;
    } else {
      claude = `<div class="msg claude bad"><div class="who">${icon('sparkle', 13)}Claude<span class="meta">${secs}${tries.length > 1 ? ` · ${tries.length} tries` : ''}</span></div>
        <p>Couldn't produce a plan that follows the platform rules, so nothing was saved.</p>
        ${(e.problems || []).length ? `<ul class="problems">${e.problems.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      </div>`;
    }
    return youHTML(e.request || {}) + claude;
  }).join('');
  const pending = S.busy && S.pendingReq ? youHTML(S.pendingReq) + `<div class="msg claude pending"><div class="who">${icon('sparkle', 13)}Claude</div><p><span class="spinner"></span>Planning, checking the rules <span class="num" id="busyT2">0s</span></p></div>` : '';
  body.innerHTML = `<div class="sec"><h2 class="plan-title">Conversation</h2><p class="summary" style="font-size:13px">What you asked, what Claude answered, and what changed in each version.</p></div>
    <div class="convo">${html || pending ? html + pending : '<div class="hint-box">Nothing sent yet. Your requests and Claude\'s replies will show up here.</div>'}</div>`;
  body.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => show(+b.dataset.v, { fit: false })));
  body.scrollTop = body.scrollHeight;
}

const FAMILIES = [['live', 'Live'], ['managed', 'Managed service'], ['files', 'Files'], ['uplynk', 'Uplynk platform'], ['destination', 'Audiences & outputs']];
