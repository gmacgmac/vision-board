#!/usr/bin/env node
// The `vb-mcp` executable: an MCP client starts it (npm run mcp, or node packages/mcp/bin/vb-mcp.ts).
// VB_SERVER is the board server (default http://127.0.0.1:4466); VB_AGENT_SECRET, when set, is the
// secret for every call that does not pass its own. Every call names the folder this server works
// in (VB_PROJECT, else the nearest folder with a Vision Board at or above the working folder), so
// the board refuses it when another folder is open. Logs go to stderr; stdout is the protocol.
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_SERVER, ENV } from '#format';
import { projectOf } from '#client';
import { createMcpServer, serveStdio } from '../src/index.ts';

const base = (process.env[ENV.server] || DEFAULT_SERVER).replace(/\/+$/, '');
const secret = process.env[ENV.agentSecret] || undefined;
const project = projectOf(process.env, process.cwd(), { fs, path });
const log = (line: string) => { process.stderr.write(`${line}\n`); };

log(`vb-mcp: serving the board API at ${base} over stdio, ${project ? `working in ${project}` : 'in no project folder (calls are not checked)'}`);
await serveStdio(createMcpServer({ base, ...(secret && { secret }), ...(project && { project }), log }), { input: process.stdin, output: process.stdout });
