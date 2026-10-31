// Dựng trang "Làng" (dist/lang.html) để theo dõi dân làng đang làm gì.
import fs from "node:fs";

const ROOT = new URL("../", import.meta.url);
const read = (p, fb) => {
  try {
    return fs.readFileSync(new URL(p, ROOT), "utf8");
  } catch {
    return fb;
  }
};
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const config = JSON.parse(read("data/config.json", "{}"));
const offers = JSON.parse(read("data/affiliates.json", '{"offers":[]}'));
const ledger = JSON.parse(read("data/ledger.json", '{"entries":[]}'));
const journal = read("data/journal.md", "")
  .split("\n")
  .filter((l) => l.startsWith("- "))
  .map((l) => l.slice(2).split("|").map((x) => x.trim()));

const postDir = new URL("site/posts/", ROOT);
const posts = fs.existsSync(postDir)
  ? fs.readdirSync(postDir).filter((f) => f.endsWith(".md")).sort().reverse().map((f) => {
      const md = fs.readFileSync(new URL(f, postDir), "utf8");
      return {
        file: f,
        html: f.replace(/\.md$/, ".html"),
        title: (md.match(/^#\s+(.+)$/m) || [, f])[1],
        date: f.slice(0, 10),
        words: md.split(/\s+/).length,
        links: (md.match(/https:\/\/(shorten\.asia|s\.shopee\.vn|shope\.ee)\/\S+/g) || []).length,
      };
    })
  : [];

const income = ledger.entries.filter((e) => e.type === "thu").reduce((s, e) => s + e.usd, 0);
const withLinks = posts.filter((p) => p.links > 0).length;
const last = journal.at(-1) || [];
const lastPost = posts.find((p) => p.file === last[2]) || posts[0];

const villagers = [
  { icon: "👑", name: "Trưởng làng", job: "Chọn ngách tiếp theo", now: last[1] ? `Chọn chủ đề "${last[1]}"` : "Đang chờ vòng đầu" },
  { icon: "🔍", name: "Thám tử", job: "Tìm từ khóa, nghiên cứu thị trường", now: last[4] || last[3] || "Chưa có" },
  { icon: "✍️", name: "Nhà văn", job: "Viết bài có link affiliate", now: lastPost ? `Viết "${lastPost.title}" (${lastPost.words} chữ)` : "Chưa có bài" },
  { icon: "💰", name: "Thủ quỹ", job: "Ghi nhật ký, đếm link và doanh thu", now: `${offers.offers.length} chiến dịch, ${withLinks}/${posts.length} bài có link` },
];

const stat = (n, label) => `<div class="stat"><b>${n}</b><span>${label}</span></div>`;

const html = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Làng AI</title>
<style>
:root{--bg:#f6f1e7;--card:#fffdf8;--ink:#2a2418;--muted:#7a6e5a;--line:#e4dccb;--accent:#b4542b;--good:#2f7d4f}
@media (prefers-color-scheme:dark){:root{--bg:#16140f;--card:#211d16;--ink:#efe8da;--muted:#a89c86;--line:#3a3328;--accent:#f0a37a;--good:#7fd19d}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 system-ui,sans-serif}
main{max-width:1000px;margin:0 auto;padding:16px}
h1{font-size:26px;margin:8px 0 2px}h2{font-size:17px;margin:28px 0 10px}
.muted{color:var(--muted)}a{color:var(--accent)}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:16px}
.stat,.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.stat b{display:block;font-size:24px}.stat span{color:var(--muted);font-size:13px}
.village{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
.card .icon{font-size:30px}.card h3{margin:4px 0 0;font-size:16px}.card .job{color:var(--muted);font-size:13px}
.card .now{margin-top:8px;font-size:14px}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}
td,th{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;font-size:14px}
th{color:var(--muted);font-weight:600}.wrap{overflow-x:auto}
.tag{display:inline-block;padding:1px 8px;border-radius:99px;font-size:12px;border:1px solid var(--line)}
.tag.ok{color:var(--good);border-color:var(--good)}
ol.timeline{list-style:none;padding:0;margin:0}ol.timeline li{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin-bottom:8px}
</style></head><body><main>
<h1>🏡 Làng AI</h1>
<div class="muted">Cập nhật lúc ${esc(new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }))} · làng làm việc lúc 8 giờ sáng mỗi ngày · <a href="./index.html">Xem blog</a></div>

<div class="stats">
${stat(posts.length, "bài đã đăng")}
${stat(withLinks, "bài có link affiliate")}
${stat(offers.offers.length, "chiến dịch đang dùng được")}
${stat(income.toLocaleString("vi-VN") + "$", "doanh thu đã ghi")}
</div>

<h2>Dân làng</h2>
<div class="village">
${villagers.map((v) => `<div class="card"><div class="icon">${v.icon}</div><h3>${v.name}</h3><div class="job">${v.job}</div><div class="now">${esc(v.now)}</div></div>`).join("\n")}
</div>

<h2>Nhật ký</h2>
<ol class="timeline">
${journal.slice().reverse().slice(0, 30).map((j) => `<li><b>${esc(j[1])}</b> <span class="muted">· ${esc(j[0])}</span><div class="muted">${esc(j.slice(3).join(" · "))}</div></li>`).join("\n") || "<li>Chưa có</li>"}
</ol>

<h2>Bài viết</h2>
<div class="wrap"><table><tr><th>Ngày</th><th>Bài</th><th>Chữ</th><th>Link aff</th></tr>
${posts.map((p) => `<tr><td>${p.date}</td><td><a href="./${p.html}">${esc(p.title)}</a></td><td>${p.words}</td><td>${p.links ? `<span class="tag ok">${p.links}</span>` : '<span class="tag">0</span>'}</td></tr>`).join("\n")}
</table></div>

<h2>Chiến dịch Accesstrade</h2>
<div class="wrap"><table><tr><th>Chiến dịch</th><th>Hoa hồng</th><th>Link</th></tr>
${offers.offers.map((o) => `<tr><td><b>${esc(o.name)}</b></td><td class="muted">${esc(o.commission.slice(0, 120))}</td><td><a href="${esc(o.link)}" rel="nofollow sponsored">link</a></td></tr>`).join("\n") || '<tr><td colspan="3">Chưa có</td></tr>'}
</table></div>
<p class="muted">Cập nhật chiến dịch lúc ${esc(offers.updated || "chưa")}.</p>
</main></body></html>`;

fs.mkdirSync(new URL("dist/", ROOT), { recursive: true });
fs.writeFileSync(new URL("dist/lang.html", ROOT), html);
console.log("Đã dựng dist/lang.html");
