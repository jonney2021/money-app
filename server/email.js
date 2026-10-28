import { createHash } from "node:crypto";
export function parseEmail({ subject = "", text = "", messageId = "" }) {
  const body = `${subject}\n${text}`;
  const money =
    body.match(
      /(?:消费|支出|交易金额|金额|purchase(?:\s+of)?|spent|amount|charged)\s*[:：]?\s*(?:(人民币|CNY|RMB|CAD|USD|HKD|[$¥￥])\s*)?([\d,]+\.\d{2})(?:\s*(人民币|元|CNY|RMB|CAD|USD|HKD))?/i,
    ) || body.match(/(CNY|RMB|CAD|USD|HKD|[$¥￥])\s*([\d,]+\.\d{2})/i);
  if (!money || /还款|payment received|statement balance|最低还款/i.test(body))
    return null;
  const amount = Number(money[2].replaceAll(",", ""));
  if (!(amount > 0) || !Number.isFinite(amount)) return null;
  const raw = (money[1] || money[3] || "").toUpperCase();
  const currency = /CNY|RMB|人民币|元|¥|￥/.test(raw)
    ? "CNY"
    : ["CAD", "USD", "HKD"].includes(raw)
      ? raw
      : null;
  const merchant =
    body
      .match(/(?:商户|商家|merchant|at)\s*[:：]?\s*([^\n，。;]{2,50})/i)?.[1]
      ?.trim() || "信用卡消费";
  const date = body.match(/\b(20\d{2})[-/年](\d{1,2})[-/月](\d{1,2})/);
  return {
    id: createHash("sha256")
      .update(messageId || body)
      .digest("hex"),
    amount,
    currency,
    merchant,
    date: date
      ? `${date[1]}-${date[2].padStart(2, "0")}-${date[3].padStart(2, "0")}`
      : new Date().toISOString().slice(0, 10),
    source: "email",
    category: "其他",
    type: "expense",
    needsReview: true,
  };
}
