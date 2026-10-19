// One way to replace a small file whole (rule 1): the text goes to a temp file beside it, which is then
// renamed over the old one, so a reader sees the old file or the new one, never half of either. The
// agents store, the chat index, the recent list, the lock and the panel states all write through it.
import fs from 'node:fs';

/** Write `text` to `file` atomically; `mode` (such as 0o600, this user only) applies to a new file. */
export function writeFileAtomic(file: string, text: string, mode?: number): void {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text, mode === undefined ? undefined : { mode });
  fs.renameSync(tmp, file);
}
