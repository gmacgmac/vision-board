// A test app whose `spin` never returns (app-cards BE_02): the host stops it at the time limit.
// `wait` waits until its call is given up (`ctx.signal`); `last` says whether that happened.
let given = false;
export default {
  tools: [
    { name: 'spin', description: 'Never return.', inputSchema: { type: 'object' }, run: () => { for (;;); } },
    { name: 'quick', description: 'Answer at once.', inputSchema: { type: 'object' }, run: () => ({ pid: process.pid }) },
    {
      name: 'wait', description: 'Wait until the call is given up.', inputSchema: { type: 'object' },
      run: (_input, ctx) => new Promise((resolve) => ctx.signal.addEventListener('abort', () => { given = true; resolve({ given }); })),
    },
    { name: 'last', description: 'Say whether a wait was given up.', inputSchema: { type: 'object' }, run: () => ({ given }) },
  ],
};
