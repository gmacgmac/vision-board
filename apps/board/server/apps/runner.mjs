// The process of one app (D-047 ruling 8, apps.md § The tools module), started by child.ts with
// Node's permission model: it may read the app's folder and this file, and nothing else; it can't
// write files, start processes or workers, or load addons. It loads the tools module, checks its
// shape and says which tools it has (`ready`, or `invalid` and it ends), then answers each
// `{ type: 'call', id, tool, input }` with `{ id, result }`, `{ id, error }` (the tool threw) or
// `{ id, refused }` (an answer too large, or not JSON), and aborts that call's `ctx.signal` on
// `{ type: 'cancel', id }`. The tools module may import Node's built-in modules only: the hash the
// person allows covers the manifest and this one file. Plain JavaScript importing only Node's own
// modules, so nothing else needs reading. It never throws out: a tool's error is that call's answer.
import { isBuiltin, registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const [file = '', envNames = '[]', outputBytes = '0'] = process.argv.slice(2);
const toolsUrl = pathToFileURL(file).href;
const name = file.split(/[\\/]/).pop();
const cap = Number(outputBytes);
const declared = JSON.parse(envNames).filter((k) => Object.hasOwn(process.env, k));
const env = Object.freeze(Object.fromEntries(declared.map((k) => [k, process.env[k]])));

registerHooks({
  resolve(specifier, context, next) {
    if (isBuiltin(specifier) || (context.parentURL === import.meta.url && specifier === toolsUrl)) return next(specifier, context);
    throw new Error(`The tools module may import only Node's built-in modules, such as node:fs. It imports "${specifier}": put that code in ${name} itself, so the version the person allows covers all of it.`);
  },
});

/** A message for the person or the agent: the error's own words, cut to a length. */
const words = (err) => String(err instanceof Error ? err.message : err).slice(0, 1000) || 'It failed without saying why.';

/** Send one message; resolve once it is sent, or at once when the board has gone. */
const send = (message) => new Promise((resolve) => {
  if (!process.connected) return resolve();
  try { process.send(message, () => resolve()); } catch { resolve(); }
});

/** The module's tools by name, after checking its shape; throws in plain words when it doesn't fit. */
function toolsOf(mod) {
  const list = mod?.default?.tools;
  if (!Array.isArray(list)) throw new Error(`${name} must export default { tools: [...] }.`);
  const tools = new Map();
  list.forEach((tool, i) => {
    const label = typeof tool?.name === 'string' ? `"${tool.name}"` : `number ${i + 1}`;
    if (typeof tool !== 'object' || tool === null) throw new Error(`Tool ${label} in ${name} is not an object.`);
    if (typeof tool.run !== 'function') throw new Error(`Tool ${label} in ${name} has no run function.`);
    if (tools.has(tool.name)) throw new Error(`${name} has two tools named ${label}.`);
    tools.set(tool.name, tool);
  });
  return tools;
}

/** A tool as the board checks it: its shape less `run`, as JSON. */
const infoOf = ({ name: n, description, inputSchema, outputSchema }) => JSON.parse(JSON.stringify({ name: n, description, inputSchema, outputSchema }));

let tools;
let infos;
try {
  tools = toolsOf(await import(toolsUrl));
  infos = [...tools.values()].map(infoOf);
} catch (err) {
  await send({ type: 'invalid', detail: `${name} could not load: ${words(err)}` });
  process.exit(0);
}

const running = new Map();

/** Run one call; its answer, whatever the tool does. */
async function call({ id, tool, input }) {
  const controller = new AbortController();
  running.set(id, controller);
  let answer;
  try {
    const found = tools.get(tool);
    if (!found) throw new Error(`There is no tool "${tool}".`);
    const result = await found.run(input, { env, signal: controller.signal });
    let text;
    try { text = JSON.stringify(result); } catch { text = undefined; }
    if (text === undefined && result !== undefined) answer = { id, refused: 'not-json' };
    else if (text !== undefined && Buffer.byteLength(text) > cap) answer = { id, refused: 'too-large' };
    else answer = { id, result };
  } catch (err) {
    answer = { id, error: words(err) };
  } finally {
    running.delete(id);
  }
  await send(answer);
}

process.on('message', (m) => {
  if (m?.type === 'call') void call(m);
  else if (m?.type === 'cancel') running.get(m.id)?.abort();
});
process.on('disconnect', () => process.exit(0));
await send({ type: 'ready', tools: infos });
