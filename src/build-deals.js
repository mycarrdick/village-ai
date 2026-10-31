// Dựng trang mã giảm giá (dist/ma-giam-gia.html) từ data/deals.json.
import fs from "node:fs";

const ROOT = new URL("../", import.meta.url);
let data = { deals: [] };
try {
  data = JSON.parse(fs.readFileSync(new URL("data/deals.json", ROOT), "utf8"));
} catch {}
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const NAMES = { tikivn: "Tiki", cellphones_cps: "CellphoneS", hoanghamobile: "Hoàng Hà Mobile", mediamart: "MediaMart", tiktok_cps: "TikTok Shop" };
const today = new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("vi-VN") : "");
const soon = (d) => d && new Date(d).getTime() - Date.now() < 3 * 864e5;

const groups = {};
for (const d of data.deals) (groups[d.merchant] ||= []).push(d);

const card = (d) => `<div class="deal">
  <div class="name">${esc(d.name.replace(/^\[[^\]]+\]-?/, ""))}</div>
  <div class="shop muted">${esc((d.name.match(/^\[([^\]]+)\]/) || [])[1] || "")}</div>
  <div class="desc">${esc(d.content)}</div>
  <div class="row">
    ${d.coupons.map((c) => `<button class="code" data-code="${esc(c)}" title="Bấm để chép mã">${esc(c)}</button>`).join("")}
    <a class="go" href="${esc(d.link)}" rel="nofollow sponsored noopener" target="_blank">${d.coupons.length ? "Dùng mã" : "Xem ưu đãi"} →</a>
  </div>
  ${d.end ? `<div class="end ${soon(d.end) ? "hot" : ""}">HSD: ${fmtDate(d.end)}${soon(d.end) ? " · sắp hết hạn" : ""}</div>` : ""}
</div>`;

const html = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mã giảm giá Tiki hôm nay ${today}</title>
<meta name="description" content="Tổng hợp ${data.deals.length} mã giảm giá và khuyến mãi đang còn hạn, cập nhật tự động mỗi ngày.">
<style>
:root{--bg:#f6f1e7;--card:#fffdf8;--ink:#2a2418;--muted:#7a6e5a;--line:#e4dccb;--accent:#b4542b;--hot:#c0392b}
@media (prefers-color-scheme:dark){:root{--bg:#16140f;--card:#211d16;--ink:#efe8da;--muted:#a89c86;--line:#3a3328;--accent:#f0a37a;--hot:#ff8a7a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif}
main{max-width:1000px;margin:0 auto;padding:16px}a{color:var(--accent)}.muted{color:var(--muted)}
h1{font-size:24px;margin:8px 0 4px}h2{font-size:18px;margin:26px 0 10px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}
.deal{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:6px}
.name{font-weight:700}.shop{font-size:13px}.desc{font-size:13px;color:var(--muted);white-space:pre-line}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:auto}
.code{font:600 14px ui-monospace,monospace;border:1.5px dashed var(--accent);background:transparent;color:var(--ink);border-radius:8px;padding:5px 10px;cursor:pointer}
.code.ok{border-style:solid}.go{font-weight:600;text-decoration:none}
.end{font-size:12px;color:var(--muted)}.end.hot{color:var(--hot);font-weight:600}
input{width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:inherit;margin-top:12px}
</style></head><body><main>
<a href="./index.html">← Làng AI</a>
<h1>Mã giảm giá hôm nay</h1>
<div class="muted">${data.deals.length} ưu đãi còn hạn · cập nhật tự động ${today} · bấm vào mã để chép. Trang có chứa link giới thiệu.</div>
<input id="q" placeholder="Tìm theo tên shop hoặc sản phẩm...">
${Object.entries(groups).map(([m, list]) => `<h2>${esc(NAMES[m] || m)} <span class="muted">(${list.length})</span></h2><div class="grid">${list.map(card).join("")}</div>`).join("\n") || "<p>Chưa có ưu đãi.</p>"}
</main>
<script>
document.addEventListener("click", (e) => {
  const b = e.target.closest(".code"); if (!b) return;
  navigator.clipboard?.writeText(b.dataset.code).then(() => { b.classList.add("ok"); b.textContent = "Đã chép " + b.dataset.code; });
});
document.getElementById("q").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll(".deal").forEach((d) => { d.style.display = d.textContent.toLowerCase().includes(q) ? "" : "none"; });
});
</script></body></html>`;

fs.mkdirSync(new URL("dist/", ROOT), { recursive: true });
fs.writeFileSync(new URL("dist/ma-giam-gia.html", ROOT), html);
console.log(`Đã dựng dist/ma-giam-gia.html (${data.deals.length} ưu đãi)`);
