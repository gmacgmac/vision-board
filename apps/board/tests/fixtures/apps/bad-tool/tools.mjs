// A test app whose tools don't fit the tool shape (app-cards FIX_01): one has no description, one an
// inputSchema that is not an object. Its problems must read in plain words, with no code marks.
export default {
  tools: [
    { name: 'one', inputSchema: { type: 'object' }, run: () => 1 },
    { name: 'two', description: 'Two.', inputSchema: 'any', run: () => 2 },
  ],
};
