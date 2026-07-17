#!/usr/bin/env bun
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), 'fixture-dist');
const port = Number(process.env.PORT || 4173);

if (!existsSync(join(root, 'index.html'))) {
  console.error('Missing fixture — run: bun run e2e/prepare.ts');
  process.exit(1);
}

const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.css': 'text/css',
};

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    // Prevent path traversal
    pathname = pathname.replace(/\.\./g, '');
    const filePath = join(root, pathname);
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      return new Response('Not found', { status: 404 });
    }
    const ext = pathname.slice(pathname.lastIndexOf('.'));
    return new Response(file, {
      headers: {
        'Content-Type': mime[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      },
    });
  },
});

console.log(`Serving ${root} on http://127.0.0.1:${port}`);
