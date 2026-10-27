// Words: apps-manifest. What is wrong in an app's files, as list_apps tells the agent.
// Keys: board.apps-manifest.<name>. Plain code: no imports but other words files and types.

// ---- manifest.ts
export const linksOutsideTheAppS = 'links outside the app\'s folder. Make it a real file.';
export const overTheLimitMakeIt = (sizeWords: string): string => `over the ${sizeWords} limit. Make it smaller.`;
export const notInTheAppS = 'not in the app\'s folder. Write it there';
export const nearLine = (line: string): string => ` near line ${line}`;
export const idIsButTheFolder = (id: string, id2: string): string => `id is "${id}", but the folder is "${id2}": make them the same.`;
export const orFixThePanelField = ', or fix the panel field in app.json';
export const orFixTheToolsField = (NOT_THERE: string): string => `${NOT_THERE}, or fix the tools field in app.json.`;
export const notValidJSON = (line: string | number): string => `not valid JSON${line}`;
