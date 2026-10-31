// Lấy khuyến mãi / mã giảm giá đang chạy từ Accesstrade cho các nhãn hàng đã được duyệt.
// Ghi vào data/deals.json để dựng trang mã giảm giá.
// Tài liệu: https://developers.accesstrade.vn/api-publisher-vietnamese/lay-thong-tin-cac-khuyen-mai-dang-hoat-dong
import fs from "node:fs";

const KEY = process.env.ACCESSTRADE_KEY;
const API = "https://api.accesstrade.vn/v1";
const ROOT = new URL("../", import.meta.url);

async function get(path) {
  const res = await fetch(API + path, { headers: { Authorization: `token ${KEY}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  let body = await res.json();
  if (typeof body === "string") body = JSON.parse(body);
  if (body?.message && !body.data) throw new Error(body.message);
  return body;
}

const clean = (s, n = 300) =>
  String(s || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

async function main() {
  if (!KEY) return console.log("Không có ACCESSTRADE_KEY, bỏ qua mã giảm giá.");
  const aff = JSON.parse(fs.readFileSync(new URL("data/affiliates.json", ROOT)));
  const merchants = [...new Set(aff.offers.map((o) => o.merchant).filter(Boolean))];

  const deals = [];
  const stats = {};
  for (const m of merchants) {
    try {
      const list = [];
      for (let page = 1; page <= 6; page++) {
        const r = await get(`/offers_informations?merchant=${encodeURIComponent(m)}&status=1&limit=50&page=${page}`);
        const d = r.data || [];
        list.push(...d);
        if (d.length < 50) break;
      }
      stats[m] = list.length;
      for (const d of list) {
        const coupons = (Array.isArray(d.coupons) ? d.coupons : [])
          .map((c) => (typeof c === "string" ? c : c.coupon_code || c.code || c.coupon || ""))
          .filter(Boolean);
        deals.push({
          id: d.id,
          merchant: d.merchant || m,
          name: clean(d.name, 160),
          content: clean(d.content),
          coupons,
          link: d.aff_link || d.link,
          image: d.image || "",
          start: d.start_time || "",
          end: d.end_time || "",
          categories: (d.categories || []).map((c) => (typeof c === "string" ? c : c.category_name_show || c.category_name || "")).filter(Boolean),
        });
      }
    } catch (e) {
      stats[m] = `lỗi: ${e.message}`;
    }
  }
  // Còn hạn trước, sắp hết hạn lên đầu.
  const now = Date.now();
  const valid = deals.filter((d) => !d.end || new Date(d.end).getTime() > now || isNaN(new Date(d.end)));
  valid.sort((a, b) => (b.coupons.length > 0) - (a.coupons.length > 0) || String(a.end).localeCompare(String(b.end)));

  fs.writeFileSync(
    new URL("data/deals.json", ROOT),
    JSON.stringify({ updated: new Date().toISOString(), stats, deals: valid.slice(0, 300) }, null, 2) + "\n"
  );
  console.log(`Đã ghi ${valid.length} khuyến mãi vào data/deals.json`);
}

main().catch((e) => console.log(`Lỗi lấy mã giảm giá: ${e.message}`));
