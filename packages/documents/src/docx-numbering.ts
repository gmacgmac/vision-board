// Word's list and heading numbers, worked out as Word does (F3): a paragraph names a `numId` and a level;
// the `num` names an `abstractNum`, which holds each level's `w:start`, `w:numFmt` and `w:lvlText`. Nums
// sharing an abstractNum share their count, and a `w:startOverride` restarts one the first time it is used.
// `w:start` left out counts from 1: the schema says 0, but only sloppy writers leave it out, and a list that
// starts "0." would be read as stated [INFERENCE: no real Word here]. A format we don't know counts in decimal.
import type { Limits } from './limits.ts';
import type { OoxmlPackage } from './ooxml.ts';
import type { XmlNode } from './xml.ts';
import { childNamed, childrenNamed, xmlTree } from './xml.ts';

const LEVELS = 9;
const LONGEST_TEXT = 64;
const LARGEST_COUNT = 1_000_000;
const LARGEST_ROMAN = 3999;
const LARGEST_LETTERS = 2600; // `a` repeated 100 times
const ROMAN: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];

interface Level { start: number; format: string; text: string; legal: boolean; restarts: boolean; style?: string | undefined }
interface Num { abstract: string; levels: (Level | undefined)[]; starts: (number | undefined)[] }

export interface Numbering {
  /** What stands before the paragraph at `level` of `numId`, counted: `5.1`, `(c)`, `I.`; `-` for a bullet; '' for none. */
  next(numId: string, level: number): string;
  /** The level a list gives a style linked to it, when the style names no level. */
  levelOfStyle(numId: string, style: string): number | undefined;
}

const count = (raw: string | undefined): number | undefined => {
  const n = Number(raw);
  return raw !== undefined && Number.isInteger(n) && n >= 0 && n <= LARGEST_COUNT ? n : undefined;
};

function roman(n: number): string {
  let out = '';
  let left = n;
  for (const [value, letters] of ROMAN) while (left >= value) { out += letters; left -= value; }
  return out;
}

const letters = (n: number) => String.fromCharCode(65 + ((n - 1) % 26)).repeat(Math.floor((n - 1) / 26) + 1);

function ordinal(n: number): string {
  const tens = n % 100;
  const ones = n % 10;
  return `${n}${tens >= 11 && tens <= 13 ? 'th' : ones === 1 ? 'st' : ones === 2 ? 'nd' : ones === 3 ? 'rd' : 'th'}`;
}

/** `n` in Word's format. Past what a format can write it is plain digits, so a hostile start costs nothing. */
export function formatNumber(n: number, format: string): string {
  if (format === 'decimalZero') return String(n).padStart(2, '0');
  if (format === 'ordinal') return ordinal(n);
  if (n >= 1 && n <= LARGEST_ROMAN && (format === 'upperRoman' || format === 'lowerRoman')) return format === 'upperRoman' ? roman(n) : roman(n).toLowerCase();
  if (n >= 1 && n <= LARGEST_LETTERS && (format === 'upperLetter' || format === 'lowerLetter')) return format === 'upperLetter' ? letters(n) : letters(n).toLowerCase();
  return String(n);
}

function readLevel(lvl: XmlNode, at: number): Level {
  const text = childNamed(lvl, 'lvlText')?.attrs['val'];
  return {
    start: count(childNamed(lvl, 'start')?.attrs['val']) ?? 1,
    format: childNamed(lvl, 'numFmt')?.attrs['val'] ?? 'decimal',
    text: text !== undefined && text.length <= LONGEST_TEXT ? text : `%${at + 1}.`,
    legal: childNamed(lvl, 'isLgl') !== undefined,
    restarts: childNamed(lvl, 'lvlRestart')?.attrs['val'] !== '0',
    style: childNamed(lvl, 'pStyle')?.attrs['val'],
  };
}

const levelAt = (lvl: XmlNode): number | undefined => {
  const at = count(lvl.attrs['ilvl'] ?? '0');
  return at !== undefined && at < LEVELS ? at : undefined;
};

function readLevels(parent: XmlNode): (Level | undefined)[] {
  const levels: (Level | undefined)[] = [];
  for (const lvl of childrenNamed(parent, 'lvl')) {
    const at = levelAt(lvl);
    if (at !== undefined) levels[at] = readLevel(lvl, at);
  }
  return levels;
}

function readNum(num: XmlNode, abstract: string): Num {
  const levels: (Level | undefined)[] = [];
  const starts: (number | undefined)[] = [];
  for (const over of childrenNamed(num, 'lvlOverride')) {
    const at = count(over.attrs['ilvl'] ?? '0');
    if (at === undefined || at >= LEVELS) continue;
    starts[at] = count(childNamed(over, 'startOverride')?.attrs['val']);
    const own = childNamed(over, 'lvl');
    if (own) levels[at] = readLevel(own, at);
  }
  return { abstract, levels, starts };
}

/** The numbering of `file`. `styleNum` gives a style's `numId`, for an `abstractNum` that only points at a list style. */
export function readNumbering(file: OoxmlPackage, limits: Limits, styleNum: (style: string) => string | undefined): Numbering {
  const xml = file.text('word/numbering.xml');
  const root = xml === undefined ? undefined : xmlTree(xml, limits);
  const abstracts = new Map<string, XmlNode>((root ? childrenNamed(root, 'abstractNum') : []).map((a) => [a.attrs['abstractNumId'] ?? '', a]));
  const nums = new Map<string, Num>();
  for (const num of root ? childrenNamed(root, 'num') : []) {
    const abstract = childNamed(num, 'abstractNumId')?.attrs['val'];
    if (num.attrs['numId'] !== undefined && abstract !== undefined) nums.set(num.attrs['numId'], readNum(num, abstract));
  }
  /** The abstractNum `abstract` comes to, through pointers to a list style. A loop of pointers stops at the one seen twice. */
  const rootOf = (abstract: string): string => {
    const seen = new Set<string>();
    let at = abstract;
    while (!seen.has(at)) {
      seen.add(at);
      const link = abstracts.get(at) && childNamed(abstracts.get(at)!, 'numStyleLink')?.attrs['val'];
      const next = link === undefined ? undefined : nums.get(styleNum(link) ?? '')?.abstract;
      if (next === undefined) return at;
      at = next;
    }
    return at;
  };
  const known = new Map<string, (Level | undefined)[]>();
  const levelsOf = (abstract: string): (Level | undefined)[] => {
    const root = rootOf(abstract);
    let levels = known.get(root);
    if (!levels) {
      const node = abstracts.get(root);
      levels = node ? readLevels(node) : [];
      known.set(root, levels);
    }
    return levels;
  };
  const level = (num: Num, at: number): Level => num.levels[at] ?? levelsOf(num.abstract)[at] ?? { start: 1, format: 'bullet', text: '', legal: false, restarts: true };
  const counts = new Map<string, (number | undefined)[]>();
  const overridden = new Set<string>();
  return {
    levelOfStyle(numId, style) {
      const num = nums.get(numId);
      if (!num) return undefined;
      const at = levelsOf(num.abstract).findIndex((l) => l?.style === style);
      return at >= 0 ? at : undefined;
    },
    next(numId, at) {
      const num = nums.get(numId);
      if (!num) return '-';
      const def = level(num, at);
      if (def.format === 'bullet') return '-';
      const root = rootOf(num.abstract);
      const counted = counts.get(root) ?? [];
      counts.set(root, counted);
      const key = `${numId}:${at}`;
      const start = overridden.has(key) ? undefined : num.starts[at];
      overridden.add(key);
      counted[at] = start ?? (counted[at] === undefined ? def.start : Math.min(counted[at]! + 1, LARGEST_COUNT));
      for (let deeper = at + 1; deeper < LEVELS; deeper++) if (level(num, deeper).restarts) counted[deeper] = undefined;
      if (def.format === 'none') return def.text.replace(/%[1-9]/g, '').trim();
      return def.text.replace(/%([1-9])/g, (_, n: string) => {
        const shown = level(num, Number(n) - 1);
        return formatNumber(counted[Number(n) - 1] ?? shown.start, def.legal ? 'decimal' : shown.format);
      });
    },
  };
}
