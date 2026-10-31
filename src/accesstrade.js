// Lấy chiến dịch Accesstrade đã được duyệt và tạo link tracking cho từng cái.
// Kết quả ghi vào data/affiliates.json để dân làng chọn chủ đề và chèn link.
// Tài liệu: https://developers.accesstrade.vn/api-publisher-vietnamese
import fs from "node:fs";

const KEY = process.env.ACCESSTRADE_KEY;
const API = "https://api.accesstrade.vn/v1";
const OUT = new URL("../data/affiliates.json", import.meta.url);
const MAX = Number(process.env.ACCESSTRADE_MAX || 15);

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
  return res.json();
}

async function main() {
  if (!KEY) {
    console.log("Không có ACCESSTRADE_KEY, bỏ qua bước lấy link Accesstrade.");
    return;
  }
  const list = await call("/campaigns?approval=successful&limit=100&page=1");
  const campaigns = (list.data || []).filter((c) => String(c.status) === "1").slice(0, MAX);
  console.log(`Có ${campaigns.length} chiến dịch đã duyệt đang chạy.`);

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
    JSON.stringify({ updated: new Date().toISOString(), source: "accesstrade", offers: out }, null, 2) + "\n"
  );
  console.log(`Đã ghi ${out.length} link vào data/affiliates.json`);
}

main().catch((e) => {
  // Lỗi Accesstrade không được làm hỏng cả vòng làm việc của làng.
  console.log(`Lỗi Accesstrade: ${e.message}`);
});
