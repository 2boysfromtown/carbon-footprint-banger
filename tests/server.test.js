import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { sep } from 'node:path';
import { test } from 'node:test';
import { createRequestHandler, isPublicAsset, resolveRequestPath } from '../server.js';

function request(port, path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = fetch(`http://127.0.0.1:${port}${path}`, { method });
    req.then(resolve, reject);
  });
}

test('resolveRequestPath rejects directory traversal attempts', () => {
  assert.equal(resolveRequestPath('/%2e%2e%2fREADME.md'), null);
  assert.ok(resolveRequestPath('/src/main.js').endsWith(`src${sep}main.js`));
});

test('isPublicAsset only allows the app shell and source assets', () => {
  assert.equal(isPublicAsset(`${process.cwd()}/index.html`), true);
  assert.equal(isPublicAsset(`${process.cwd()}/src/main.js`), true);
  assert.equal(isPublicAsset(`${process.cwd()}/package.json`), false);
});

test('preview server returns security headers and blocks private repo files', async () => {
  const server = createServer(createRequestHandler({ root: process.cwd(), port: 0 }));
  server.listen(0);
  await once(server, 'listening');
  const port = server.address().port;

  try {
    const home = await request(port, '/', 'HEAD');
    const privateFile = await request(port, '/package.json');

    assert.equal(home.status, 200);
    assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(home.headers.get('content-security-policy').includes("default-src 'self'"));
    assert.equal(privateFile.status, 403);
  } finally {
    server.close();
    await once(server, 'close');
  }
});
