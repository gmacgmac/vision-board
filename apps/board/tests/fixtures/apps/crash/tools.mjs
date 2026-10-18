// A test app whose `boom` ends its own process (app-cards BE_02): the host starts it again on the
// next call, and marks the app broken after too many crashes.
export default {
  tools: [
    { name: 'boom', description: 'Stop the process.', inputSchema: { type: 'object' }, run: () => { console.error('boom: stopping on purpose'); process.exit(3); } },
    { name: 'ok', description: 'Answer at once.', inputSchema: { type: 'object' }, run: () => ({ pid: process.pid }) },
    { name: 'hog', description: 'Use more memory than the process may.', inputSchema: { type: 'object' }, run: () => { const keep = []; for (;;) keep.push(new Array(1e6).fill(keep.length)); } },
  ],
};
