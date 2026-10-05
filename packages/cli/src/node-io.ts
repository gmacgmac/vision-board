// The real `Io` for the executable: process streams, the file system and the environment.
import fs from 'node:fs';
import type { Io } from './run.ts';

async function readAll(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

export function nodeIo(): Io {
  return {
    stdout: (text) => { process.stdout.write(text); },
    stderr: (text) => { process.stderr.write(text); },
    readStdin: () => readAll(process.stdin),
    readFile: (file) => fs.readFileSync(file, 'utf8'),
    env: process.env,
  };
}
