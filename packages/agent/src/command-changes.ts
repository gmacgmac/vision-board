// What a shell command is known to change (D-069 rulings 1, 2): for a row that lets a command it can't judge ask
// (`unknownCommand`, access-rules.ts), which words a command is known to change, so `policy.ts` keeps refusing those.
// Fails shut: anything that looks like a known changer counts. What isn't known here rests on the person's answer.
// Pure: no I/O. How a command splits into words is `readonly-command.ts`'s.
import { isFlag, runsProgram, shellWords } from './readonly-command.ts';

/** Programs that change the files they name (D-069 ruling 1): the row that refuses a write holds for them. Never `cp`,
 * which only changes its target (`copyTargets`). A program not here is one the rules can't judge. */
const CHANGERS: readonly string[] = [
  'rm', 'rmdir', 'unlink', 'shred', 'srm', 'mv', 'tee', 'truncate', 'dd', 'touch', 'chmod', 'chown', 'chgrp', 'chflags', 'setfacl', 'xattr',
  'ln', 'link', 'install', 'rsync', 'ditto', 'scp', 'patch',
];
/** Programs that change a file only with a flag: the flag's forms, wherever the flag comes in its command. */
const CHANGING_FLAGS: Record<string, RegExp> = {
  sed: /^(?:-[a-zA-Z]*i|--in-place)/, perl: /^-[a-zA-Z]*i/, ruby: /^-[a-zA-Z]*i/, awk: /^(?:-i|--include)/, gawk: /^(?:-i|--include)/,
  sort: /^(?:-[a-zA-Z]*o|--output)/, curl: /^(?:-[a-zA-Z]*[oO]|--output|--remote-name)/, wget: /^(?:-[a-zA-Z]*O|--output-document)/,
  find: /^-(?:delete|fprint|fprint0|fprintf|fls)$/,
};

const programName = (word: string) => word.split('/').pop()!;
/** Move the shell: from then on, a relative word names a file in a folder the words don't say. */
const MOVES = ['cd', 'pushd', 'popd'];

/** The words `cp` with `args` writes: `-t` (or `--target-directory`), else its last name. Null when it makes a second
 * name for the file instead of a copy (`-l`, `-s`, their long forms), so what follows can reach the file, or it can't be told. */
function copyTargets(args: string[]): string[] | null {
  const names: string[] = [];
  const targets: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--') { names.push(...args.slice(i + 1)); break; }
    if (!isFlag(a)) { names.push(a); continue; }
    if (/^--(?:l|sy)/.test(a) || /^-[a-zA-Z]*[ls]/.test(a)) return null;
    const value = /^(?:--t[a-z-]*(=?)|-[a-zA-Z]*t)(.*)$/.exec(a);
    if (value) targets.push(value[2] || args[++i] || '');
  }
  if (targets.length > 0) return targets;
  return names.length >= 2 ? [names[names.length - 1]!] : null;
}

/** What is known to change in a command that does not only read. */
export interface KnownChanges {
  /** Every word it names may change: a known changer runs somewhere in it, however it is spelled. */
  every: boolean;
  /** The words it writes: a redirection's, a `cp`'s target. With a `cd`, where those land can't be told, so `every`. */
  targets: string[];
}

/**
 * What `command` is known to change (D-069 rulings 1, 2). A word that merely equals a changer's name counts (`xargs rm`,
 * `busybox rm`, `find -exec rm`), and so does a piece of a quoted script (`sh -c 'rm "$1"'`, `runsProgram`): a false
 * refusal costs a question, a missed one a person's file. `cp` is read as a copy only when it starts its simple command;
 * anywhere else (`env cp`, `xargs cp`) what it writes can't be told, so it counts as a changer.
 */
export function knownChanges(command: string): KnownChanges {
  const { commands, redirected } = shellWords(command);
  const targets = [...redirected];
  let every = runsProgram(command, CHANGERS) !== null;
  let moves = false;
  for (const simple of commands) {
    const words = simple.map((w) => w.text);
    const names = words.map(programName);
    if (names.some((n) => CHANGERS.includes(n))) every = true;
    if (names.some((n) => MOVES.includes(n))) moves = true;
    words.forEach((_, i) => {
      const flags = Object.hasOwn(CHANGING_FLAGS, names[i]!) ? CHANGING_FLAGS[names[i]!]! : undefined;
      if (flags && words.slice(i + 1).some((w) => flags.test(w))) every = true;
    });
    if (names.slice(1).includes('cp')) every = true;
    if (names[0] === 'cp') {
      const copied = copyTargets(words.slice(1));
      if (copied) targets.push(...copied); else every = true;
    }
  }
  return { every: every || (moves && targets.length > 0), targets };
}
