import http from 'node:http';
import fs from 'node:fs';
import { handleAstra, astraConfig } from './server/astra-llm.js';

// Load .env.local if present (local dev convenience).
try {
  const envText = fs.readFileSync('.env.local', 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.ASTRA_CORS_ORIGIN || '*';

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Only /api/astra
  const url = (req.url || '').split('?')[0];
  if (url !== '/api/astra' && url !== '/api/astra/') {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let raw = '';
  for await (const chunk of req) raw += chunk;
  const { status, body } = await handleAstra(req.method, raw, astraConfig(process.env));
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
});

server.listen(PORT, () => {
  console.log(`Astra backend listening on port ${PORT}`);
});
