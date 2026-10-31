// Gọi Claude API với giới hạn chi tiêu cứng theo tháng.
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";

export const MODEL = process.env.VILLAGE_MODEL || "claude-haiku-5-5";

// Giá USD cho 1 triệu token (prompt <= 100K). Sửa nếu đổi model.
const PRICES = {
  "claude-haiku-5-5": { in: 0.1, out: 0.5 },
  "claude-sonnet-5-5": { in: 2, out: 10 },
  "claude-opus-5-5": { in: 4, out: 20 },
};
const WEB_SEARCH_USD = 0.01; // 10 USD / 1000 lượt tìm kiếm

const LEDGER = new URL("../data/ledger.json", import.meta.url);
const CONFIG = JSON.parse(fs.readFileSync(new URL("../data/config.json", import.meta.url)));

export function readLedger() {
  return JSON.parse(fs.readFileSync(LEDGER));
}
function writeLedger(l) {
  fs.writeFileSync(LEDGER, JSON.stringify(l, null, 2) + "\n");
}

export function monthSpend(ledger = readLedger()) {
  const month = new Date().toISOString().slice(0, 7);
  return ledger.entries
    .filter((e) => e.type === "chi" && e.date.startsWith(month))
    .reduce((s, e) => s + e.usd, 0);
}

export function record(entry) {
  const l = readLedger();
  l.entries.push({ date: new Date().toISOString(), ...entry });
  writeLedger(l);
}

const client = process.env.DRY_RUN ? null : new Anthropic();

/**
 * Một dân làng nói chuyện với Claude.
 * @param {string} who  tên dân làng (để ghi sổ)
 * @param {string} system  vai trò
 * @param {string} prompt  việc cần làm
 * @param {{webSearch?: number, maxTokens?: number}} opts
 */
export async function ask(who, system, prompt, opts = {}) {
  const budget = Number(process.env.MONTHLY_BUDGET_USD || CONFIG.monthlyApiBudgetUsd);
  const spent = monthSpend();
  if (spent >= budget) {
    throw new Error(`Hết ngân sách tháng: đã chi ${spent.toFixed(3)}$ / ${budget}$`);
  }

  if (!client) return fakeAnswer(who, prompt);

  const tools = opts.webSearch
    ? [{ type: "web_search_20250305", name: "web_search", max_uses: opts.webSearch }]
    : undefined;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens || 8000,
    output_config: { effort: "low" },
    system,
    messages: [{ role: "user", content: prompt }],
    ...(tools ? { tools } : {}),
  });

  if (res.stop_reason === "refusal") throw new Error(`${who}: model từ chối yêu cầu`);

  const p = PRICES[MODEL] || PRICES["claude-haiku-5-5"];
  const searches = res.usage.server_tool_use?.web_search_requests || 0;
  const usd =
    (res.usage.input_tokens * p.in + res.usage.output_tokens * p.out) / 1e6 +
    searches * WEB_SEARCH_USD;
  record({ type: "chi", who, usd: Number(usd.toFixed(5)), note: `${MODEL}, ${searches} lượt tìm` });

  return res.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

export function parseJson(text) {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  return JSON.parse(m ? m[1] : text);
}

function fakeAnswer(who, prompt) {
  if (who === "Trưởng làng")
    return '{"niche":"mẹo tiết kiệm tiền cho sinh viên","angle":"bài hướng dẫn","reason":"chạy thử"}';
  if (who === "Thám tử")
    return '{"title":"10 mẹo tiết kiệm tiền cho sinh viên năm 2026","keywords":["tiết kiệm","sinh viên"],"outline":["Lập ngân sách","Nấu ăn tại nhà"],"affiliateKeys":[]}';
  if (who === "Nhà văn") return "# Bài chạy thử\n\nĐây là nội dung giả khi chạy DRY_RUN.";
  return "Chạy thử, không gọi API.";
}
