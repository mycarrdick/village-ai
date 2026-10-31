// Một vòng làm việc của làng: chọn việc -> tìm ngách -> viết bài -> ghi sổ.
import fs from "node:fs";
import { VILLAGERS } from "./agents.js";
import { ask, parseJson, readLedger, monthSpend } from "./llm.js";

const CONFIG = JSON.parse(fs.readFileSync(new URL("../data/config.json", import.meta.url)));
const POSTS = new URL("../site/posts/", import.meta.url);
const LOG = new URL("../data/journal.md", import.meta.url);

function log(line) {
  const text = `- ${new Date().toISOString()} ${line}\n`;
  process.stdout.write(text);
  fs.appendFileSync(LOG, text);
}

function existingTitles() {
  return fs
    .readdirSync(POSTS)
    .filter((f) => f.endsWith(".md"))
    .map((f) => fs.readFileSync(new URL(f, POSTS), "utf8").split("\n")[0].replace(/^#\s*/, ""));
}

function slugify(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function oneRound() {
  const { chief, scout, writer } = VILLAGERS;
  const done = existingTitles();
  const affiliates = Object.fromEntries(
    Object.entries(CONFIG.affiliateLinks).filter(([k]) => !k.startsWith("_"))
  );

  // 1. Trưởng làng chọn ngách
  const plan = parseJson(
    await ask(
      chief.name,
      chief.system,
      `Các bài đã viết: ${JSON.stringify(done)}
Link affiliate đang có: ${JSON.stringify(Object.keys(affiliates))}
Chọn 1 ngách cho bài tiếp theo, không trùng bài cũ, ưu tiên ngách khớp với link affiliate đang có.
Trả về JSON duy nhất: {"niche": "...", "angle": "...", "reason": "..."}`,
      { maxTokens: 2000 }
    )
  );
  log(`Trưởng làng chọn ngách: ${plan.niche} (${plan.reason})`);

  // 2. Thám tử nghiên cứu
  const brief = parseJson(
    await ask(
      scout.name,
      scout.system,
      `Ngách: ${plan.niche}. Góc viết: ${plan.angle}.
Tìm từ khóa người Việt hay tìm và một tiêu đề hấp dẫn, không trùng: ${JSON.stringify(done)}.
Chọn link affiliate phù hợp trong danh sách: ${JSON.stringify(Object.keys(affiliates))} (có thể để trống).
Trả về JSON duy nhất: {"title": "...", "keywords": ["..."], "outline": ["..."], "affiliateKeys": ["..."]}`,
      { webSearch: 3, maxTokens: 4000 }
    )
  );
  log(`Thám tử đề xuất: ${brief.title}`);

  // 3. Nhà văn viết bài
  const links = Object.fromEntries((brief.affiliateKeys || []).filter((k) => affiliates[k]).map((k) => [k, affiliates[k]]));
  const article = await ask(
    writer.name,
    writer.system,
    `Viết bài: "${brief.title}"
Từ khóa: ${brief.keywords.join(", ")}
Dàn ý: ${brief.outline.map((o, i) => `${i + 1}. ${o}`).join("\n")}
Link affiliate được phép dùng: ${JSON.stringify(links)}
Chỉ trả về bài viết Markdown.`,
    { maxTokens: 6000 }
  );

  const file = `${new Date().toISOString().slice(0, 10)}-${slugify(brief.title)}.md`;
  fs.writeFileSync(new URL(file, POSTS), article.trim() + "\n");
  log(`Nhà văn đăng bài: ${file}`);
}

async function main() {
  fs.mkdirSync(POSTS, { recursive: true });
  const n = Number(process.env.POSTS_PER_RUN || CONFIG.postsPerRun);
  for (let i = 0; i < n; i++) {
    try {
      await oneRound();
    } catch (e) {
      log(`Lỗi: ${e.message}`);
      if (e.message.startsWith("Hết ngân sách")) break;
    }
  }
  const ledger = readLedger();
  const income = ledger.entries.filter((e) => e.type === "thu").reduce((s, e) => s + e.usd, 0);
  log(`Thủ quỹ: tháng này đã chi ${monthSpend(ledger).toFixed(4)}$, tổng thu ${income.toFixed(2)}$`);
}

main();
