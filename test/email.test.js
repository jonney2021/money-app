import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEmail } from "../server/email.js";
import { createStore } from "../server/store.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("recognizes CAD purchase and date with stable Gmail deduplication", () => {
  const value = {
    subject: "Credit card purchase",
    text: "Purchase of CAD 1,234.56\nMerchant: Loblaws\n2026-10-27",
    messageId: "gmail-123",
  };
  const t = parseEmail(value);
  assert.equal(t.amount, 1234.56);
  assert.equal(t.currency, "CAD");
  assert.equal(t.merchant, "Loblaws");
  assert.equal(t.date, "2026-10-27");
  assert.equal(t.needsReview, true);
  assert.equal(t.id, parseEmail({ ...value, text: value.text + " footer" }).id);
  assert.notEqual(t.id, parseEmail({ ...value, messageId: "gmail-456" }).id);
});
test("supports Chinese spending and rejects statements and payments", () => {
  const t = parseEmail({
    text: "您于2026年10月27日在商户：超市\n消费人民币125.50元",
  });
  assert.equal(t.currency, "CNY");
  assert.equal(t.amount, 125.5);
  assert.equal(parseEmail({ text: "Payment received CAD 100.00" }), null);
  assert.equal(parseEmail({ text: "Statement balance CAD 100.00" }), null);
  assert.equal(parseEmail({ text: "您的最低还款金额：人民币125.50元" }), null);
  assert.equal(parseEmail({ text: "hello there" }), null);
});
test("ambiguous dollar symbols require review without guessing currency", () => {
  assert.equal(
    parseEmail({ text: "Purchase of $45.67 at Coffee Shop" }).currency,
    null,
  );
});
test("store persists and deduplicates simultaneous deliveries", async () => {
  const path = await mkdtemp(join(tmpdir(), "money-app-"));
  try {
    const store = createStore(path),
      t = parseEmail({ text: "CAD 12.30", messageId: "123" });
    await Promise.all([
      store.add(t),
      store.add(t),
      store.add({ ...t, id: "456" }),
    ]);
    assert.equal((await createStore(path).read()).length, 2);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
});
