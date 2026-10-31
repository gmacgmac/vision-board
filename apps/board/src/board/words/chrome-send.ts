// Words: chrome-send. The Send button, its states and tooltips.
// Keys: board.chrome-send.<name>. Plain code: no imports but other words files and types.

// ---- SendButton.svelte
export const sendToAgent = 'Send to agent';
export const sending = 'Sending…';
export const sent = 'Sent';
export const notSentTryAgain = 'Not sent · try again';
export const waitingForAgent = 'Waiting for agent';
export const yourAnswersGoToThe = 'Your answers go to the agent when it finishes this turn';
export const nothingNewToSend = 'Nothing new to send';
export const tellTheAgentsYouAre = 'Tell the agents you are done: they read your answers next';
export const sentToTheAgent = 'Sent to the agent';
// With the workAlongside flag: what was sent while the agent works is queued, and the person keeps working.
export const queued = 'Queued';
export const queuedGoesToThe = 'Queued: it goes to the agent when it finishes this turn, with every answer you give until then';
