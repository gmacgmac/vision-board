// Approval card pattern, layer 2 (template): one pure function from an approval's view to its
// markup. nclite's ApprovalAsk: a band with the kind of change and the time left, the question,
// the subject in a mono block, then the answers the request offers (the allows, the time line as the
// spacer, Deny on its own at the end). With no time limit the band has no time and the line says it
// waits for the person. A settled card shows how it was settled instead of the buttons.
import { esc } from '../esc.ts';
import type { ApprovalChoice, ApprovalView } from './approval-core.ts';

const button = (c: ApprovalChoice, disabled: boolean): string =>
  `<button type="button" class="chat-btn${c.primary ? ' chat-btn-primary' : ''}" data-choice="${c.id}"${disabled ? ' disabled' : ''}>${esc(c.label)}</button>`;

const list = (cls: string, label: string, items: readonly string[]): string => items.length
  ? `<div class="${cls}"><span class="chat-ask-key">${esc(label)}</span><ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`
  : '';

/** `left` is the time line ("1:52 left"); the element keeps it current. */
export function approvalTemplate(v: ApprovalView, left: string): string {
  const open = v.phase === 'open';
  const band = `<div class="chat-ask-band"><span class="chat-ask-family">${esc(v.family)}</span>`
    + `<span class="chat-ask-ttl">${open && v.timed ? esc(left) : ''}</span></div>`;
  const preview = v.preview ? `<pre class="chat-ask-preview" tabindex="0" aria-label="Preview of the change">${esc(v.preview)}</pre>` : '';
  const facts = `<p class="chat-ask-what">${esc(v.title)}</p><p class="chat-ask-subject">${esc(v.subject)}</p>${preview}`
    + list('chat-ask-risks', 'Risks', v.risks) + list('chat-ask-paths', 'Paths', v.paths);
  const allows = v.choices.filter((c) => c.answer.approved).map((c) => button(c, !open)).join('');
  const deny = v.choices.filter((c) => !c.answer.approved).map((c) => button(c, !open)).join('');
  const lapse = v.timed ? 'Denied if not answered' : 'Waiting for your answer';
  const end = open
    ? `<div class="chat-ask-acts">${allows}<span class="chat-ask-lapse">${lapse}</span>${deny}</div>`
    : `<p class="chat-ask-outcome" data-tone="${v.outcome?.tone ?? 'quiet'}">${esc(v.outcome?.text ?? '')}</p>`;
  return `${band}${facts}${end}<p class="chat-ask-error" role="alert" hidden></p>`;
}
