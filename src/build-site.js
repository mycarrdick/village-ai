// Dựng web tĩnh từ các bài Markdown để đăng lên GitHub Pages.
import fs from "node:fs";
import { marked } from "marked";

const ROOT = new URL("../", import.meta.url);
const CONFIG = JSON.parse(fs.readFileSync(new URL("data/config.json", ROOT)));
const POSTS = new URL("site/posts/", ROOT);
const OUT = new URL("dist/", ROOT);

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const page = (title, body) => `<!doctype html>
<html lang="${CONFIG.language}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
body{max-width:720px;margin:0 auto;padding:16px;font:17px/1.65 system-ui,sans-serif;color:#222;background:#fffdf8}
a{color:#b4542b}h1,h2{line-height:1.25}header a{text-decoration:none;font-weight:700}
@media (prefers-color-scheme:dark){body{background:#17150f;color:#eee}a{color:#f0a37a}}
</style></head><body>
<header><a href="./index.html">${esc(CONFIG.siteName)}</a></header>
${body}
<footer><p><small>Nội dung do đội AI của ${esc(CONFIG.siteName)} viết. Một số bài có link giới thiệu.</small></p></footer>
</body></html>`;

fs.mkdirSync(OUT, { recursive: true });
const files = fs.existsSync(POSTS) ? fs.readdirSync(POSTS).filter((f) => f.endsWith(".md")).sort().reverse() : [];
const items = [];
for (const f of files) {
  const md = fs.readFileSync(new URL(f, POSTS), "utf8");
  const title = (md.match(/^#\s+(.+)$/m) || [, f])[1];
  const html = f.replace(/\.md$/, ".html");
  fs.writeFileSync(new URL(html, OUT), page(title, `<article>${marked.parse(md)}</article>`));
  items.push(`<li><a href="./${html}">${esc(title)}</a> <small>${f.slice(0, 10)}</small></li>`);
}
fs.writeFileSync(
  new URL("index.html", OUT),
  page(CONFIG.siteName, `<h1>${esc(CONFIG.siteName)}</h1><ul>${items.join("\n")}</ul>`)
);
console.log(`Đã dựng ${files.length} bài vào dist/`);
