#!/usr/bin/env node
const http = require("http");
const net = require("net");
const { spawn } = require("child_process");

const PORT = parseInt(process.env.PORT || "3000", 10);
const METRO_PORT = PORT + 1;

const env = { ...process.env, PORT: String(METRO_PORT) };

function tryProxy(req, res) {
  const options = {
    hostname: "127.0.0.1",
    port: METRO_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${METRO_PORT}` },
  };
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on("error", () => {
    res.writeHead(503, { "Content-Type": "text/plain" });
    res.end("Metro is starting up, please wait...");
  });
  req.pipe(proxyReq, { end: true });
}

const server = http.createServer(tryProxy);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[dev-proxy] Listening on 0.0.0.0:${PORT} → Metro on :${METRO_PORT}`);

  const metroEnv = { ...env };

  const metro = spawn(
    "pnpm",
    ["exec", "expo", "start", "--port", String(METRO_PORT)],
    { stdio: "inherit", env: metroEnv }
  );

  metro.on("exit", (code) => {
    server.close();
    process.exit(code ?? 0);
  });
});

server.on("error", (err) => {
  console.error("[dev-proxy] Server error:", err);
  process.exit(1);
});

process.on("SIGTERM", () => {
  server.close();
  process.exit(0);
});
