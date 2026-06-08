import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_PORT = 5173;
export const PUBLIC_ASSET_PREFIXES = Object.freeze(['src/']);

const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
]);

export function getSecurityHeaders(contentType) {
  return {
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    'Content-Type': contentType,
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  };
}

export function resolveRequestPath(urlPath = '/', root = process.cwd(), port = DEFAULT_PORT) {
  const rootPath = resolve(root);
  const url = new URL(urlPath, `http://localhost:${port}`);
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const candidate = resolve(rootPath, `.${decodeURIComponent(pathname)}`);
  const relativePath = relative(rootPath, candidate);

  if (relativePath.startsWith('..') || relativePath === '..') {
    return null;
  }

  return candidate;
}

export function isPublicAsset(filePath, root = process.cwd()) {
  const rootPath = resolve(root);
  const relativePath = relative(rootPath, filePath).replaceAll('\\', '/');
  return relativePath === 'index.html' || PUBLIC_ASSET_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, getSecurityHeaders('text/plain; charset=utf-8'));
  response.end(message);
}

function sendFile(response, target, statusCode = 200) {
  response.writeHead(statusCode, getSecurityHeaders(types.get(extname(target)) || 'application/octet-stream'));
  createReadStream(target).pipe(response);
}

export function createRequestHandler({ root = process.cwd(), port = DEFAULT_PORT } = {}) {
  const rootPath = resolve(root);
  const fallback = join(rootPath, 'index.html');

  return function requestHandler(request, response) {
    let filePath;

    try {
      filePath = resolveRequestPath(request.url, rootPath, port);
    } catch {
      sendText(response, 400, 'Bad request');
      return;
    }

    if (!filePath || (existsSync(filePath) && !isPublicAsset(filePath, rootPath))) {
      sendText(response, 403, 'Forbidden');
      return;
    }

    const target = existsSync(filePath) && statSync(filePath).isFile() ? filePath : fallback;
    if (request.method === 'HEAD') {
      response.writeHead(200, getSecurityHeaders(types.get(extname(target)) || 'application/octet-stream'));
      response.end();
      return;
    }

    sendFile(response, target);
  };
}

export function startServer({ root = process.cwd(), port = Number(process.env.PORT || DEFAULT_PORT) } = {}) {
  const server = createServer(createRequestHandler({ root, port }));
  server.listen(port, () => {
    const address = server.address();
    const actualPort = typeof address === 'object' && address ? address.port : port;
    console.log(`CarbonWise available at http://localhost:${actualPort}`);
  });
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}
