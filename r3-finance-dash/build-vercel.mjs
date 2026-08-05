import fs from "fs";
import path from "path";

const vercelOutput = ".vercel/output";
fs.rmSync(vercelOutput, { recursive: true, force: true });
fs.mkdirSync(path.join(vercelOutput, "static"), { recursive: true });
fs.cpSync("dist/client", path.join(vercelOutput, "static"), { recursive: true });

fs.mkdirSync(path.join(vercelOutput, "functions", "index.func"), { recursive: true });
fs.cpSync("dist/server", path.join(vercelOutput, "functions", "index.func", "dist", "server"), { recursive: true });

const handlerCode = `
let _server;

async function getServer() {
  if (_server) return _server;
  const mod = await import("./dist/server/server.js");
  _server = mod.default ?? mod;
  return _server;
}

function toHeaders(incomingHeaders) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(incomingHeaders || {})) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v != null) headers.append(key, String(v));
      }
      continue;
    }
    headers.set(key, String(value));
  }
  return headers;
}

async function readBody(req) {
  const method = (req.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD") return undefined;
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (!chunks.length) return undefined;
  return Buffer.concat(chunks);
}

export default async function (req, res) {
  try {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const url = new URL(req.url, \`\${protocol}://\${host}\`);

    const body = await readBody(req);
    const headers = toHeaders(req.headers);
    if (body && !headers.has("content-length")) {
      headers.set("content-length", String(body.length));
    }

    const webReq = new Request(url.href, {
      method: req.method,
      headers,
      body,
    });

    const server = await getServer();
    const webRes = await server.fetch(webReq);

    webRes.headers.forEach((v, k) => res.setHeader(k, v));
    res.status(webRes.status);

    const buffer = await webRes.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "FUNCTION_INVOCATION_FAILED (Custom Wrapper)",
      message: error?.message ?? String(error),
      stack: error?.stack,
    });
  }
}
`;

fs.writeFileSync(path.join(vercelOutput, "functions", "index.func", "index.js"), handlerCode);
fs.writeFileSync(path.join(vercelOutput, "functions", "index.func", "package.json"), JSON.stringify({ type: "module" }));
fs.writeFileSync(path.join(vercelOutput, "functions", "index.func", ".vc-config.json"), JSON.stringify({
  runtime: "nodejs20.x",
  handler: "index.js",
  launcherType: "Nodejs"
}));

fs.writeFileSync(path.join(vercelOutput, "config.json"), JSON.stringify({
  version: 3,
  routes: [
    { handle: "filesystem" },
    { src: "/(.*)", dest: "/index" }
  ]
}));

console.log("Vercel output created successfully!");
