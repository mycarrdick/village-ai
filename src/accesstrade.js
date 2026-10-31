// Lấy chiến dịch Accesstrade đã được duyệt và tạo link tracking cho từng cái.
// Kết quả ghi vào data/affiliates.json để dân làng chọn chủ đề và chèn link.
// Tài liệu: https://developers.accesstrade.vn/api-publisher-vietnamese
import fs from "node:fs";

const KEY = process.env.ACCESSTRADE_KEY;
const API = "https://api.accesstrade.vn/v1";
const OUT = new URL("../data/affiliates.json", import.meta.url);
const MAX = Number(process.env.ACCESSTRADE_MAX || 25);

const clean = (s) =>
  String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);

async function call(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: { Authorization: `token ${KEY}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  let body = await res.json();
  // API đôi khi trả JSON bị bọc thành chuỗi.
  if (typeof body === "string") body = JSON.parse(body);
  if (body?.message && !body.data) throw new Error(`${path}: ${body.message}`);
  return body;
}

async function main() {
  if (!KEY) {
    console.log("Không có ACCESSTRADE_KEY, bỏ qua bước lấy link Accesstrade.");
    return;
  }
  // Lấy tất cả chiến dịch để thống kê, rồi lọc cái đã duyệt và đang chạy.
  const all = [];
  let sample = "";
  for (let page = 1; page <= 10; page++) {
    const r = await call(`/campaigns?limit=50&page=${page}`);
    if (page === 1) sample = JSON.stringify(r).slice(0, 400);
    const d = r.data || [];
    all.push(...d);
    if (d.length < 50) break;
  }
  const stats = { total: all.length, approval: {}, status: {} };
  for (const c of all) {
    stats.approval[c.approval] = (stats.approval[c.approval] || 0) + 1;
    stats.status[c.status] = (stats.status[c.status] || 0) + 1;
  }
  let approved = all.filter((c) => c.approval === "successful");
  if (!approved.length) {
    const r = await call("/campaigns?approval=successful&limit=50&page=1");
    approved = r.data || [];
    stats.approvedQuery = approved.length;
  }
  stats.approvedNames = approved.map((c) => `${c.name} (status ${c.status})`);
  const campaigns = approved.filter((c) => String(c.status) === "1").slice(0, MAX);
  console.log(`Thống kê: ${JSON.stringify(stats)}`);

  const out = [];
  for (const c of campaigns) {
    try {
      const r = await call("/product_link/create", {
        method: "POST",
        body: JSON.stringify({ campaign_id: String(c.id), urls: [c.url], utm_source: "village-ai" }),
      });
      const link = r?.data?.success_link?.[0];
      if (!link) throw new Error("không tạo được link");
      out.push({
        name: c.name,
        merchant: c.merchant,
        category: [c.category, c.sub_category].filter(Boolean).join(" / "),
        commission: clean(c.description?.commission_policy),
        about: clean(c.description?.introduction),
        rules: clean(c.description?.traffic_building_policy),
        link: link.short_link || link.aff_link,
      });
    } catch (e) {
      console.log(`Bỏ qua ${c.name}: ${e.message}`);
    }
  }

  fs.writeFileSync(
    OUT,
    JSON.stringify({ updated: new Date().toISOString(), source: "accesstrade", stats, offers: out }, null, 2) + "\n"
  );
  console.log(`Đã ghi ${out.length} link vào data/affiliates.json`);
}

main().catch((e) => {
  // Lỗi Accesstrade không được làm hỏng cả vòng làm việc của làng.
  console.log(`Lỗi Accesstrade: ${e.message}`);
});
