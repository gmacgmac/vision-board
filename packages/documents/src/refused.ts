// Why a file was refused, as a code and never a sentence: this package has no words, so a host says
// each in its own (the board: `words/server-chat.ts` `refusedBecause`). A refusal never carries text
// from the file, since a name in a hostile archive is a place to put words for the agent to read.
export type RefusalCode =
  | 'notZip' | 'malformed' | 'zip64' | 'encrypted' | 'method' | 'tooMany' | 'tooBig' | 'badName' | 'link' | 'bomb'
  | 'xmlDoctype' | 'xmlMalformed' | 'xmlLimit' | 'notDocument' | 'noSheet' | 'badRange';

export class DocumentRefused extends Error {
  readonly code: RefusalCode;

  constructor(code: RefusalCode) {
    super(code);
    this.code = code;
  }
}

export const refuse = (code: RefusalCode): never => { throw new DocumentRefused(code); };
