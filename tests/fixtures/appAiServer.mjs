// Loopback-only E2E host. Never bundled or deployed; real Worker handler + D1,
// signed fixture tokens and deterministic inference (no provider network calls).
import http from 'node:http';
import { decodeJwt } from 'jose';
import { workerHarness } from './workerHarness.mjs';

const harness = await workerHarness();
// An isolated worktree can use a separate browser port; test access stays on loopback.
const testOrigin = process.env.QUIZ_E2E_ORIGIN || 'http://127.0.0.1:5174';
const originUrl = new URL(testOrigin);
if (
  originUrl.protocol !== 'http:' ||
  originUrl.hostname !== '127.0.0.1' ||
  originUrl.origin !== testOrigin
)
  throw new Error('The E2E origin must be an HTTP loopback origin.');
const behavior = new Map();
const server = http.createServer(async (incoming, outgoing) => {
  const url = new URL(incoming.url, 'http://127.0.0.1:5176');
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': testOrigin,
  };
  try {
    if (url.pathname === '/__test/token') {
      outgoing.writeHead(200, headers);
      outgoing.end(JSON.stringify({ token: await harness.token(url.searchParams.get('uid')) }));
      return;
    }
    if (url.pathname === '/__test/behavior') {
      behavior.set(url.searchParams.get('uid'), url.searchParams.get('mode'));
      outgoing.writeHead(200, headers);
      outgoing.end('{}');
      return;
    }
    if (url.pathname === '/__test/health') {
      outgoing.writeHead(200, headers);
      outgoing.end('{}');
      return;
    }
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    let uid;
    try {
      uid = decodeJwt(incoming.headers.authorization?.slice(7)).sub;
    } catch {
      /* Worker rejects it. */
    }
    const env = {
      ...harness.env,
      ALLOWED_ORIGINS: testOrigin,
      AI: {
        async run(model, input) {
          const mode = behavior.get(uid);
          if (mode === 'failure') throw new Error('Fixture inference unavailable');
          if (mode === 'slow') await new Promise((r) => setTimeout(r, 600));
          return harness.env.AI.run(model, input);
        },
      },
    };
    const response = await harness.worker.fetch(
      new Request(url, {
        method: incoming.method,
        headers: incoming.headers,
        ...(body.length ? { body } : {}),
      }),
      env
    );
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(await response.text());
  } catch {
    outgoing.writeHead(500, headers);
    outgoing.end('{}');
  }
});
server.listen(5176, '127.0.0.1', () => process.stdout.write('Local App AI test API ready\n'));
async function stop() {
  server.close();
  await harness.dispose();
  process.exit(0);
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
