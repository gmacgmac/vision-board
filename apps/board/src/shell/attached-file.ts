// One attached file's pure parts (D-068): the limits, the name a chip shows and the contract takes, the name it is
// saved under, its bytes as the operation's `data`. `chat-bridge.ts` holds the files themselves.
import * as chatWords from './words/chat.ts';

/** The server's limits (D-068 ruling 3), held equal to them by apps/board/tests/chat-attach.test.ts. */
export const FILE_BYTES = 10 * 1024 * 1024;
export const FILE_COUNT = 10;
const FILE_LABEL_MAX = 200;
/** What the contract's `fileLabel` refuses; a test holds the two equal. */
const NOT_IN_A_LABEL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]+/g;
const PICTURE_TYPE = /^image\/(?:x-)?([a-z0-9]+)/i;
/** What a browser names a picture on the clipboard, which is no name of the person's. */
const CLIPBOARD_NAME = /^image\.[a-z0-9]+$/i;

/** A label that would show nothing, which the contract's `fileLabel` refuses; a test holds the two equal. */
const SHOWS_NOTHING = /^[\p{White_Space}\p{Default_Ignorable_Code_Point}\u2800]*$/u;

/** A name as the contract's `label` takes it: a file's name can hold a line break or a text-direction
 *  mark, and those would refuse the whole message; none when nothing is left. */
export function fileLabel(name: string): string | undefined {
  const clean = name.replace(NOT_IN_A_LABEL, ' ').replace(/\s+/g, ' ').trim().slice(0, FILE_LABEL_MAX).replace(/[\ud800-\udbff]$/, '');
  return SHOWS_NOTHING.test(clean) ? undefined : clean;
}

/** The file's name, or for a picture pasted with none of its own, one from the words: the day, its type's extension. */
export function attachedName(file: Pick<File, 'name' | 'type'>, pasted: boolean, now: Date): string {
  const picture = PICTURE_TYPE.exec(file.type)?.[1]?.toLowerCase();
  if (!picture || (file.name !== '' && !(pasted && CLIPBOARD_NAME.test(file.name)))) return file.name;
  const day = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((n) => String(n).padStart(2, '0')).join('-');
  return chatWords.pastedPicture(day, picture === 'jpeg' ? 'jpg' : picture);
}

/** A file's bytes as the operation's `data`: standard base64, padded. */
export async function fileData(file: Pick<Blob, 'arrayBuffer'>): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let at = 0; at < bytes.length; at += 0x8000) binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
  return btoa(binary);
}
