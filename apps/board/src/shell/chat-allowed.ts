// What the person allowed the agent "for this folder", as the chat panel holds it (agentAccessRules flag,
// agent-access-and-working ASK_01): the kept yeses (`list_permissions`, api.md 107), read when the drawing
// comes, when the header's list opens and when a yes for the folder is given; and Forget, which asks first
// (the confirm dialog), then `forget_permission`, and the agent asks again. The header draws the list
// (packages/chat); with the flag off, or before the list has been read, it offers none.
import type { ChatForgetDetail } from '#chat';
import { allowedLabel, CHAT_ALLOWED_EVENT, CHAT_FORGET_EVENT } from '#chat';
import { flagOn } from '#format';
import { ApiError } from '../board/io.ts';
import { pageFlags } from '../flags.ts';
import type { FolderPermission } from './page-io.ts';
import { forgetPermission, listPermissions } from './page-io.ts';
import * as chatWords from './words/chat.ts';

export interface AllowedDeps {
  confirm(heading: string, body: string, confirm: string): Promise<boolean>;
  /** A problem to tell the person. */
  fail(err: unknown): void;
  /** The list changed: draw the header again. */
  changed(): void;
}

export interface Allowed {
  /** The kept yeses; null when the flag is off or they have not been read yet (the header then offers no list). */
  readonly list: readonly FolderPermission[] | null;
  /** Read them again; `quiet`, a failure says nothing. */
  load(quiet?: boolean): Promise<void>;
  /** Listen to the header: its list opened (read it again), and a yes chosen to forget (confirm, forget it; one
   *  already forgotten, in another tab, just leaves the list). `on` is the panel's listener for an element event. */
  wire(on: <T>(type: string, fn: (detail: T) => unknown) => void): void;
}

export function createAllowed(d: AllowedDeps): Allowed {
  const on = flagOn('agentAccessRules', pageFlags());
  let kept: readonly FolderPermission[] | null = null;
  const set = (next: readonly FolderPermission[]) => { kept = next; d.changed(); };

  async function load(quiet = false) {
    if (!on) return;
    try { set((await listPermissions()).permissions); } catch (err) { if (!quiet) d.fail(err); }
  }

  async function forget({ id }: ChatForgetDetail) {
    const yes = kept?.find((p) => p.id === id);
    if (!yes || !(await d.confirm(chatWords.forgetThisYes, chatWords.theAgentWillAskAgain(allowedLabel(yes)), chatWords.forget))) return;
    try {
      set((await forgetPermission(id)).permissions);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) await load();
      else d.fail(err);
    }
  }

  return {
    get list() { return on ? kept : null; },
    load,
    wire(listen) {
      listen(CHAT_ALLOWED_EVENT, () => load());
      listen<ChatForgetDetail>(CHAT_FORGET_EVENT, forget);
    },
  };
}
