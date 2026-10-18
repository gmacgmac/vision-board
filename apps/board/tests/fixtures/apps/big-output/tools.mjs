// A test app whose `big` answers more than an answer may hold (app-cards BE_02).
export default {
  tools: [
    { name: 'big', description: 'Answer 300 KiB.', inputSchema: { type: 'object' }, run: () => ({ text: 'x'.repeat(300 * 1024) }) },
    { name: 'small', description: 'Answer a little.', inputSchema: { type: 'object' }, run: () => ({ text: 'x' }) },
  ],
};
