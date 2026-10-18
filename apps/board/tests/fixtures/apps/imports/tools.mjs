// A test app whose tools module imports another file (app-cards BE_02): refused, since the version
// the person allows covers app.json and this file only.
import { helper } from './helper.mjs';

export default { tools: [{ name: 'one', description: 'Answer one.', inputSchema: { type: 'object' }, run: () => ({ value: helper() }) }] };
