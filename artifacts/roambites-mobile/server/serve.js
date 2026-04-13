/**
 * Production server for Expo web export.
 *
 * Serves the output of `expo export --platform web` (dist/) as a SPA:
 * - GET /status → health check (200 OK)
 * - Static files from dist/ → served with correct MIME types
 * - Any path not matching a file → dist/index.html (SPA fallback)
 *
 * Zero external dependencies — uses only Node.js built-ins (http, fs, path).
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST_ROOT = path.resolve(__dirname, "..", "dist");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
};

function resolveFile(urlPath) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const candidate = path.join(DIST_ROOT, safePath);
  if (!candidate.startsWith(DIST_ROOT)) return null;
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }
  return null;
}

const indexHtml = path.join(DIST_ROOT, "index.html");

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname === "/status") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  const filePath = resolveFile(pathname);
  if (filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "content-type": contentType });
    res.end(fs.readFileSync(filePath));
    return;
  }

  if (fs.existsSync(indexHtml)) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(indexHtml));
  } else {
    res.writeHead(503, { "content-type": "text/plain" });
    res.end("App not built yet. Run: pnpm exec expo export --platform web");
  }
});

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`RoamBites web serving dist/ on port ${port}`);
  if (!fs.existsSync(DIST_ROOT)) {
    console.warn("WARNING: dist/ not found — run build first");
  }
});
