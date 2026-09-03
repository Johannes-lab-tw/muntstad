// serve.js — zero-dependency static server for docs/ (used by the Playwright tests and for the iPad on the same Wi-Fi).
// Usage: node scripts/serve.js [--port 4173] [--host 127.0.0.1] [--dir docs]
//        npm run serve -- --host 0.0.0.0   → reachable from the iPad at http://<pc-ip>:4173/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', arg('dir', 'docs'));
const port = Number(arg('port', process.env.PORT || 4173));
const host = arg('host', '127.0.0.1');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.woff2': 'font/woff2',
};

export function createServer(rootDir = root) {
  return http.createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch (e) {
      res.writeHead(400);
      res.end('Bad request');
      return;
    }
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const filePath = path.normalize(path.join(rootDir, urlPath));
    if (!filePath.startsWith(rootDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Niet gevonden');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Content-Length': stat.size,
        'Cache-Control': 'no-cache',
        'Service-Worker-Allowed': '/',
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      fs.createReadStream(filePath).pipe(res);
    });
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href; // works on Windows and Linux (CI)
if (isMain) {
  const server = createServer(root);
  server.listen(port, host, () => {
    console.log(`Muntstad wordt geserveerd vanuit ${root}`);
    console.log(`  Lokaal:   http://127.0.0.1:${port}/`);
    if (host === '0.0.0.0') {
      for (const list of Object.values(os.networkInterfaces())) {
        for (const net of list || []) {
          if (net.family === 'IPv4' && !net.internal) console.log(`  iPad:     http://${net.address}:${port}/`);
        }
      }
    }
    console.log('Stoppen: Ctrl+C');
  });
}
