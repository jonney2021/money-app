import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { timingSafeEqual } from "node:crypto";
import { parseEmail } from "./email.js";
import { createStore } from "./store.js";
const store = createStore(process.env.DATA_DIR || "./data");
function authorized(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  const a = Buffer.from(token),
    b = Buffer.from(secret || "");
  return Boolean(secret) && a.length === b.length && timingSafeEqual(a, b);
}
const root = resolve("public");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};
const secret = process.env.EMAIL_WEBHOOK_SECRET;
// Only normalized transactions are retained; raw email bodies are never persisted.
http
  .createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (req.url === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end('{"ok":true}');
    }
    if (req.url?.startsWith("/api/"))
      res.setHeader("Cache-Control", "no-store");
    if (req.url === "/api/email/transactions" && req.method === "GET") {
      if (!authorized(req)) {
        res.writeHead(401);
        return res.end("Unauthorized");
      }
      try {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ transactions: await store.read() }));
      } catch {
        res.writeHead(500);
        res.end("Storage unavailable");
      }
      return;
    }
    if (req.url === "/api/email/parse" && req.method === "POST") {
      if (!authorized(req)) {
        res.writeHead(401);
        return res.end("Unauthorized");
      }
      let body = "";
      try {
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 100000) {
            res.writeHead(413);
            return res.end();
          }
        }
        const data = JSON.parse(body);
        if (
          typeof data.text !== "string" ||
          (data.subject !== undefined && typeof data.subject !== "string") ||
          (data.messageId !== undefined && typeof data.messageId !== "string")
        )
          throw Error();
        const transaction = parseEmail(data);
        if (transaction) {
          try {
            await store.add(transaction);
          } catch {
            res.writeHead(500);
            return res.end("Storage unavailable");
          }
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ transaction }));
      } catch {
        res.writeHead(400);
        return res.end("Invalid email payload");
      }
    }
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      return res.end();
    }
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const file = resolve(
        root,
        "." + (pathname === "/" ? "/index.html" : pathname),
      );
      if (!file.startsWith(root + "/")) throw Error();
      const data = await readFile(file);
      res.writeHead(200, {
        "Content-Type": types[extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(req.method === "HEAD" ? undefined : data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(Number(process.env.PORT) || 3000, "0.0.0.0", () =>
    console.log("money-app listening on port " + (process.env.PORT || 3000)),
  );
