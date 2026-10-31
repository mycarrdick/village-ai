# Làng AI

Một đội nhân vật AI tự làm việc mỗi ngày để kiếm tiền online bằng cách hợp pháp: tìm ngách, viết bài hữu ích có link affiliate, đăng lên web miễn phí và ghi sổ thu chi.

## Dân làng

| Nhân vật | Việc |
|---|---|
| Trưởng làng | Chọn ngách tiếp theo có khả năng ra tiền |
| Thám tử | Tìm từ khóa, tiêu đề, dàn ý (có tìm kiếm web) |
| Nhà văn | Viết bài Markdown chuẩn SEO, chèn link affiliate được phép |
| Thủ quỹ | Ghi mọi chi phí API vào `data/ledger.json`, chặn khi hết ngân sách |

Mỗi sáng 8 giờ (giờ VN), GitHub Actions mở Claude Code bằng gói Claude của bạn, làm một vòng theo `VILLAGE.md`, lưu bài mới vào `site/posts/` và đăng web lên GitHub Pages.

## Chi phí

Mặc định làng chạy bằng gói Claude bạn đang trả, không tốn thêm tiền, nhưng dùng chung hạn mức chat của bạn.

Cách dự phòng (dùng Claude API, tách khỏi hạn mức chat): code trong `src/` vẫn dùng được với `npm run village` và `ANTHROPIC_API_KEY`.

- Model mặc định: Claude Haiku 5.5 (rất rẻ, mỗi bài khoảng vài xu Mỹ, cộng 0,01$ mỗi lượt tìm web).
- Giới hạn cứng: `monthlyApiBudgetUsd` trong `data/config.json` (mặc định 15$). Hết tiền là làng tự dừng.
- GitHub Actions và GitHub Pages miễn phí với repo public.

## Cài đặt một lần (phần chỉ người thật làm được)

1. Trên máy đã cài Claude Code, chạy `claude setup-token` và đăng nhập bằng tài khoản Claude (Pro/Max).
2. Trong repo GitHub: Settings → Secrets and variables → Actions → thêm `CLAUDE_CODE_OAUTH_TOKEN` với token vừa lấy.
3. Settings → Pages → Source: chọn **GitHub Actions**.
4. Đăng ký chương trình affiliate (ví dụ Shopee, Lazada, Accesstrade, hosting...) rồi dán link vào `affiliateLinks` trong `data/config.json`.
5. Vào tab Actions, chạy thử "Làng AI làm việc mỗi ngày".

## Chạy trên máy

```bash
npm install
npm run dry        # chạy thử không tốn tiền
ANTHROPIC_API_KEY=... npm run village && npm run build
```

## Ghi doanh thu

Thủ quỹ chưa tự đọc được tiền từ các sàn affiliate. Tạm thời thêm dòng vào `data/ledger.json`:

```json
{ "date": "2026-11-15T00:00:00Z", "type": "thu", "who": "affiliate", "usd": 3.2, "note": "Shopee tháng 11" }
```

## Luật làng

Không spam, không nội dung giả, không đánh giá ảo, không vi phạm điều khoản nền tảng. Mọi bài có link giới thiệu đều ghi rõ.
