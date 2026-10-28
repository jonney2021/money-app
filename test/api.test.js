import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
test("real HTTP service authenticates, imports, deduplicates and serves PWA assets", async () => {
  const dir = await mkdtemp(join(tmpdir(), "money-api-")),
    port = 40000 + Math.floor(Math.random() * 10000);
  const child = spawn(process.execPath, ["server/index.js"], {
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dir,
      EMAIL_WEBHOOK_SECRET: "test-only-private-secret",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(Error("server startup timeout")),
        5000,
      );
      child.stdout.once("data", () => {
        clearTimeout(timer);
        resolve();
      });
      child.once("error", reject);
      child.once("exit", (code) => reject(Error("server exited " + code)));
    });
    const base = `http://127.0.0.1:${port}`,
      headers = {
        Authorization: "Bearer test-only-private-secret",
        "Content-Type": "application/json",
      };
    assert.equal((await fetch(base + "/api/health")).status, 200);
    assert.equal((await fetch(base + "/api/email/transactions")).status, 401);
    assert.equal(
      (
        await fetch(base + "/api/email/parse", {
          method: "POST",
          headers: { Authorization: "Bearer wrong" },
        })
      ).status,
      401,
    );
    const body = JSON.stringify({
      messageId: "unique-123",
      subject: "Purchase",
      text: "Purchase of CAD 10.50\nMerchant: Metro",
    });
    for (let i = 0; i < 2; i++) {
      const r = await fetch(base + "/api/email/parse", {
        method: "POST",
        headers,
        body,
      });
      assert.equal(r.status, 200);
      assert.equal((await r.json()).transaction.amount, 10.5);
    }
    const r = await fetch(base + "/api/email/transactions", { headers });
    assert.equal(r.headers.get("cache-control"), "no-store");
    assert.equal((await r.json()).transactions.length, 1);
    assert.equal(
      (
        await fetch(base + "/api/email/parse", {
          method: "POST",
          headers,
          body: '{"text":42}',
        })
      ).status,
      400,
    );
    for (const path of [
      "/",
      "/app.js",
      "/style.css",
      "/sw.js",
      "/manifest.webmanifest",
      "/icon.svg",
    ])
      assert.equal((await fetch(base + path)).status, 200, path);
    assert.equal((await fetch(base + "/server/index.js")).status, 404);
    assert.equal((await fetch(base + "/data/transactions.json")).status, 404);
  } finally {
    child.kill();
    await new Promise((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once("exit", resolve);
    });
    await rm(dir, { recursive: true, force: true });
  }
});
