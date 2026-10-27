// Front door of the board's engine part (api.md § The engine): `createEngine({ dir, ... })` with
// `route`, `resolve`, `turn`, `tools` and `watch`, HTTP-free. Hosts import only this file: the
// standalone server (server/app.ts, dispatch.ts), its tests, and a skill's tests that check what the
// engine checks. The route matching and the body check are here too, for a host's edge that must
// pick its caller check before anything is read.
export { createEngine, ENGINE_OPERATIONS, servesOperation } from './engine.ts';
export type { Engine, EngineChange, EngineOperation, EngineOptions, EngineRequest } from './engine.ts';
export { matchRoute, ONLY_PERSON, readParams } from './operations.ts';
export type { EngineReply } from './operations.ts';
export type { EngineTool, ToolOutcome } from './tools.ts';
export { checkBody } from './writes.ts';
export type { Caller } from '../ledger.ts';
/** The board's JSON Schemas, compiled as the engine checks against them (by `$id`). */
export { compileSchema } from '../schema.ts';
