// A test-only tool (app-cards FE_02): says back what it was given, so a page test can tell a call
// from the card's own panel reached the board's server.
export default {
  tools: [{
    name: 'echo',
    description: 'Say back the text given.',
    inputSchema: { type: 'object', properties: { text: { type: 'string', maxLength: 100 } }, required: ['text'], additionalProperties: false },
    run: ({ text }) => ({ text }),
  }],
};
