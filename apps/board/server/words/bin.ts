// Words: bin. The board's command-line tools.
// Keys: board.bin.<name>. Plain code: no imports but other words files and types.

// ---- validate.ts
export const lineSchema = (i: number, pointer: string, detail: string): string => `line ${i}: schema ${pointer}: ${detail}`;
export const cannotRead = (value: string): string => `cannot read: ${value}`;

// ---- plugin-types.ts (plugin.d.ts: a host's compiler reads the header; the build and a test print the rest)
export const typesHeader = `// The board plugin's types, made by \`npm run build:plugin\` from the code: do not edit.
// \`mount\` is the view's one export (view/board.js), \`createEngine\` the engine's (engine/engine.js); the rest is what
// they take and give. The view uses the DOM's types, the engine Node's (\`AbortSignal\`).
`;
export const declaredFunction = (doc: string, signature: string): string => `${doc}export declare ${signature};`;
export const seamBehind = (now: string, held: string, seam: number): string =>
  `the seam's types changed (hash ${now}, seam.ts holds ${held}). Decide: a change a host built against seam ${seam} would not survive `
  + `(a member removed or renamed, a type narrowed for what a host gives or widened for what it receives, a new required member, a changed meaning) `
  + `raises SEAM to ${seam + 1} too; an addition that leaves them working does not. Then set SEAM_TYPES in apps/board/plugin/seam.ts to the new hash.`;
