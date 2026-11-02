// The skill a plugin's bot reads (`skill.md`): skills/vision-board/SKILL.md with the edits of words/skill-edits.ts,
// which take out what only the standalone host has (join, the chat panel's permissions, apps), and the pictures' folder named from the board folder.
// Each edit's `from` must occur exactly once, so a change to the skill under an edit stops the build.
import { skillEdits } from './words/skill-edits.ts';

/** The plugin's skill, made from the standalone skill's text. */
export function skillFor(source: string): string {
  let text = source;
  for (const { from, until, toEnd, to } of skillEdits) {
    const at = text.indexOf(from);
    if (at < 0 || text.indexOf(from, at + 1) >= 0) throw new Error(`skill edit: ${JSON.stringify(from.slice(0, 60))} must occur exactly once in the skill`);
    const stop = toEnd ? text.length : until === undefined ? at + from.length : text.indexOf(until, at + from.length);
    if (stop < 0) throw new Error(`skill edit: ${JSON.stringify(from.slice(0, 60))} has no ${JSON.stringify(until?.slice(0, 60))} after it`);
    text = text.slice(0, at) + to + text.slice(stop);
  }
  return `${text.trimEnd()}\n`;
}
