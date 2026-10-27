// Every pattern's own pattern.json, for the gallery and its page test: the patterns are listed here,
// so nothing outside this module reads its folders (D-059). tests/patterns.test.ts fails when a
// pattern folder is missing from the list.
import type { FlagName } from '#format';
import appFrame from './app-frame/pattern.json' with { type: 'json' };
import imageView from './image-view/pattern.json' with { type: 'json' };
import markdown from './markdown/pattern.json' with { type: 'json' };
import node from './node/pattern.json' with { type: 'json' };
import noteBubble from './note-bubble/pattern.json' with { type: 'json' };
import region from './region/pattern.json' with { type: 'json' };
import selectionBar from './selection-bar/pattern.json' with { type: 'json' };

/** What a pattern says about itself (its pattern.json). */
export interface PatternInfo {
  name: string;
  title: string;
  /** The element, for a pattern that has one; `entry` names the function of one that draws markup only. */
  tag?: string;
  entry?: string;
  /** What the page test looks for, for a pattern with no element. */
  selector?: string;
  description: string;
  states: string[];
  whenToUse: string;
  whenNotToUse: string;
  /** The flag a pattern's behaviour ships behind: its section shows only with the flag on. */
  flag?: FlagName;
}

export const PATTERNS: readonly PatternInfo[] = [appFrame, imageView, markdown, node, noteBubble, region, selectionBar] as PatternInfo[];
