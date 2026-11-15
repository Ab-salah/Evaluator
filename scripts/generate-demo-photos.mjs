// Draws the demo shop-front pictures in public/demo/ from the demo catalog,
// so each picture shows exactly the branding its scores count.
//
//   node scripts/generate-demo-photos.mjs
//
// Needs Node 23.6+ (loads the TypeScript catalog directly) and sharp, which
// Next.js installs. Only needed when the catalog changes; the pictures are
// committed.
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { DEMO_SAMPLES, DEMO_SHOPS, auditPhoto, layoutFor, samplePhoto } from "../src/lib/demo/catalog.ts";

const OUT = path.join(import.meta.dirname, "..", "public", "demo");
const W = 1200;
const H = 800;

const OP = {
  Zain: { main: "#23aeb7", dark: "#11717a", accent: "#c3d534", label: "zain", tag: ["5G is here", "Unlimited data"], head: ["5G", "BD 9", "eSIM"] },
  stc: { main: "#4f008c", dark: "#32005a", accent: "#ff375e", label: "stc", tag: ["Super 5G", "Go further"], head: ["5G+", "BD 12", "100GB"] },
  Batelco: { main: "#d4212a", dark: "#8f1118", accent: "#ffd2d4", label: "Batelco", tag: ["Fibre at home", "Plans for all"], head: ["FIBRE", "BD 15", "TV+"] },
};

const FACADES = [
  { wall: "#e9dfcc", trim: "#c9b99a", upper: "#efe7d6" },
  { wall: "#dcd6cf", trim: "#b7ada2", upper: "#e7e2dc" },
  { wall: "#e6d5bf", trim: "#c4ab88", upper: "#efe2d0" },
  { wall: "#d5dde0", trim: "#a9b4ba", upper: "#e2e7e9" },
];
const SIGNS = [
  { bg: "#1f2a44", fg: "#f2c94c", sub: "#e8dcc0" },
  { bg: "#5a1f2b", fg: "#ffffff", sub: "#f3d7a8" },
  { bg: "#1e4d3a", fg: "#f6eb69", sub: "#e3f0e8" },
  { bg: "#2b2b2b", fg: "#ffffff", sub: "#cfcfcf" },
  { bg: "#0f3b5c", fg: "#ffffff", sub: "#bfe3f5" },
];

const LATIN = "Arial, Helvetica, sans-serif";
const ARABIC = "Tahoma, Arial, sans-serif";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const WINDOW = { windowL: { x: 150, y: 314, w: 330, h: 330 }, windowR: { x: 720, y: 314, w: 330, h: 330 } };
const PILLAR = { pillarL: { x: 58, y: 306, w: 84, h: 374 }, pillarR: { x: 1058, y: 306, w: 84, h: 374 } };
const DOOR = { x: 500, y: 314, w: 200, h: 366 };
const STEPS = [
  { x: 478, w: 244, tread: 680, riser: 688 },
  { x: 458, w: 284, tread: 702, riser: 710 },
  { x: 438, w: 324, tread: 724, riser: 732 },
];

function text(x, y, s, { size, weight = 700, fill = "#fff", anchor = "middle", family = LATIN, extra = "" }) {
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" ${extra}>${esc(s)}</text>`;
}

function glass(id, { x, y, w, h }) {
  return `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#glass)"/>
  <rect x="${x + 14}" y="${y + h - 120}" width="${w - 28}" height="10" fill="#3d4f5e" opacity="0.6"/>
  <rect x="${x + 14}" y="${y + h - 70}" width="${w - 28}" height="10" fill="#3d4f5e" opacity="0.6"/>
  <rect x="${x + 30}" y="${y + h - 52}" width="${w - 60}" height="52" fill="#2f3d49" opacity="0.55"/>
  ${[0.2, 0.5, 0.8].map((f) => `<ellipse cx="${x + w * f}" cy="${y + 18}" rx="16" ry="5" fill="#fffbe6" opacity="0.8"/>`).join("")}
  <polygon points="${x + w * 0.55},${y} ${x + w * 0.75},${y} ${x + w * 0.35},${y + h} ${x + w * 0.15},${y + h}" fill="#ffffff" opacity="0.10"/>`;
}

function fascia(look, shop, sign) {
  const y = 168;
  if (!look.fascia) {
    return `
  <rect x="50" y="${y}" width="1100" height="122" rx="8" fill="${sign.bg}"/>
  <rect x="50" y="${y}" width="1100" height="20" rx="8" fill="#ffffff" opacity="0.08"/>
  ${text(600, y + 66, shop.name.toUpperCase(), { size: 56, weight: 800, fill: sign.fg, extra: 'letter-spacing="3"' })}
  ${text(600, y + 108, shop.arabic, { size: 32, weight: 700, fill: sign.sub, family: ARABIC })}`;
  }
  const o = OP[look.fascia];
  return `
  <rect x="50" y="${y}" width="1100" height="122" rx="8" fill="url(#op-${look.fascia})"/>
  <circle cx="1080" cy="${y + 20}" r="90" fill="#ffffff" opacity="0.07" clip-path="url(#clip-fascia)"/>
  ${text(200, y + 86, o.label, { size: look.fascia === "Batelco" ? 62 : 86, weight: 800 })}
  <rect x="352" y="${y + 18}" width="4" height="86" fill="#ffffff" opacity="0.7"/>
  ${text(750, y + 62, shop.name, { size: 46, weight: 800 })}
  ${text(750, y + 104, shop.arabic, { size: 30, weight: 700, family: ARABIC, fill: "#ffffffdd" })}`;
}

function windowSticker(brand, slot, { x, y, w, h }, n) {
  const o = OP[brand];
  const cx = x + w / 2;
  const cy = y + h / 2;
  return `<g clip-path="url(#clip-${slot})">
  <rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" fill="url(#op-${brand})"/>
  <circle cx="${x + w - 30}" cy="${y + 40}" r="70" fill="${o.accent}" opacity="0.35"/>
  <circle cx="${x + 40}" cy="${y + h - 30}" r="56" fill="#ffffff" opacity="0.12"/>
  ${text(cx, cy - 4, o.label, { size: brand === "Batelco" ? 60 : 84, weight: 800 })}
  ${text(cx, cy + 48, o.tag[n % 2], { size: 28, weight: 700 })}
  <rect x="${x + 4}" y="${y + h - 26}" width="${w - 8}" height="22" fill="${o.accent}" opacity="0.9"/></g>`;
}

function pillarSticker(brand, { x, y, w, h }) {
  const o = OP[brand];
  const cx = x + w / 2;
  const cy = y + h / 2;
  return `
  <rect x="${x + 6}" y="${y + 8}" width="${w - 12}" height="${h - 16}" rx="4" fill="url(#op-${brand})"/>
  <rect x="${x + 6}" y="${y + h - 40}" width="${w - 12}" height="32" fill="${o.accent}" opacity="0.9"/>
  ${text(cx, cy, o.label, { size: brand === "Batelco" ? 34 : 44, weight: 800, extra: `transform="rotate(-90 ${cx} ${cy})" dominant-baseline="middle"` })}`;
}

function poster(brand, x, y, w, h, n) {
  const o = OP[brand];
  const s = w / 88;
  return `
  <rect x="${x + 3}" y="${y + 4}" width="${w}" height="${h}" fill="#000" opacity="0.18"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffffff"/>
  <rect x="${x}" y="${y}" width="${w}" height="${30 * s}" fill="${o.main}"/>
  ${text(x + w / 2, y + 21 * s, o.label, { size: 17 * s, weight: 800 })}
  ${text(x + w / 2, y + 72 * s, o.head[n % 3], { size: (o.head[n % 3].length > 3 ? 22 : 30) * s, weight: 800, fill: o.dark })}
  ${text(x + w / 2, y + 94 * s, "monthly plan", { size: 10 * s, weight: 700, fill: "#555" })}
  <rect x="${x}" y="${y + h - 10 * s}" width="${w}" height="${10 * s}" fill="${o.accent === "#ffd2d4" ? o.dark : o.accent}"/>`;
}

function strip(brand, slot) {
  const o = OP[brand];
  if (slot === "frameL" || slot === "frameR") {
    const x = slot === "frameL" ? 486 : 700;
    let marks = "";
    for (let yy = 340; yy < 670; yy += 64) {
      marks += text(x + 7, yy, o.label, { size: 9, weight: 800, extra: `transform="rotate(-90 ${x + 7} ${yy})" dominant-baseline="middle"` });
    }
    return `<rect x="${x}" y="314" width="14" height="366" fill="${o.main}"/>${marks}`;
  }
  const step = STEPS[Number(slot.slice(-1)) - 1];
  let marks = "";
  for (let xx = step.x + 30; xx < step.x + step.w - 10; xx += 62) {
    marks += text(xx, step.riser + 11, o.label, { size: 10, weight: 800 });
  }
  return `<rect x="${step.x}" y="${step.riser}" width="${step.w}" height="14" fill="${o.main}"/>${marks}`;
}

function badge(brand, i) {
  const o = OP[brand];
  const x = 512 + i * 60;
  const y = 586;
  return `
  <rect x="${x}" y="${y}" width="52" height="52" rx="6" fill="#ffffff" stroke="${o.main}" stroke-width="3"/>
  ${text(x + 26, y + 16, "APPROVED", { size: 8, weight: 800, fill: o.dark })}
  ${text(x + 26, y + 26, "RESELLER", { size: 8, weight: 800, fill: o.dark })}
  ${text(x + 26, y + 43, o.label, { size: brand === "Batelco" ? 10 : 13, weight: 800, fill: o.main })}`;
}

function pushPull(brand) {
  const o = OP[brand];
  return `
  <rect x="528" y="472" width="48" height="22" rx="4" fill="${o.main}"/>
  ${text(552, 488, "PUSH", { size: 12, weight: 800 })}
  <rect x="624" y="472" width="48" height="22" rx="4" fill="${o.main}"/>
  ${text(648, 488, "PULL", { size: 12, weight: 800 })}`;
}

function drawShopFront(shop, look) {
  const layout = layoutFor(look);
  const h = hash(shop.slug);
  const facade = FACADES[h % FACADES.length];
  const sign = SIGNS[(h >>> 3) % SIGNS.length];

  const defs = `
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9dcf2"/><stop offset="1" stop-color="#eef6fb"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fb7c7"/><stop offset="1" stop-color="#5c7487"/></linearGradient>
    <linearGradient id="doorglass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b3c7d4"/><stop offset="1" stop-color="#6f8798"/></linearGradient>
    ${Object.entries(WINDOW).map(([k, b]) => `<clipPath id="clip-${k}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/></clipPath>`).join("")}
    <clipPath id="clip-fascia"><rect x="50" y="168" width="1100" height="122" rx="8"/></clipPath>
    ${Object.entries(OP).map(([k, o]) => `<linearGradient id="op-${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${o.main}"/><stop offset="1" stop-color="${o.dark}"/></linearGradient>`).join("")}
  </defs>`;

  const upper = [110, 410, 710, 1010]
    .map((x) => `<rect x="${x}" y="50" width="130" height="78" fill="#5d7487" stroke="#f7f3ea" stroke-width="6"/><line x1="${x + 65}" y1="50" x2="${x + 65}" y2="128" stroke="#f7f3ea" stroke-width="4"/>`)
    .join("");

  const stickerBySlot = new Map(layout.stickers.map((s, i) => [s.slot, { ...s, n: i }]));
  const windows = Object.entries(WINDOW)
    .map(([slot, box]) => {
      const sticker = stickerBySlot.get(slot);
      return `${glass(slot, box)}${sticker ? windowSticker(sticker.brand, slot, box, sticker.n) : ""}<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="none" stroke="#2e2e2e" stroke-width="8"/>`;
    })
    .join("");
  const pillars = Object.entries(PILLAR)
    .map(([slot, box]) => {
      const sticker = stickerBySlot.get(slot);
      return `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="${facade.wall}"/>${sticker ? pillarSticker(sticker.brand, box) : ""}`;
    })
    .join("");

  const posters = layout.posters
    .map((p, i) => {
      if (p.slot === "door") return poster(p.brand, 512, 334, 76, 108, i);
      const box = WINDOW[p.slot];
      return poster(p.brand, box.x + 20 + p.index * 102, box.y + 38, 88, 126, i);
    })
    .join("");

  const door = `
  <rect x="${DOOR.x}" y="${DOOR.y}" width="${DOOR.w}" height="${DOOR.h}" fill="url(#doorglass)"/>
  <polygon points="560,314 600,314 540,680 500,680" fill="#ffffff" opacity="0.12"/>
  <rect x="${DOOR.x}" y="${DOOR.y}" width="${DOOR.w}" height="${DOOR.h}" fill="none" stroke="#2e2e2e" stroke-width="8"/>
  <line x1="600" y1="314" x2="600" y2="680" stroke="#2e2e2e" stroke-width="6"/>
  <rect x="584" y="452" width="8" height="96" rx="3" fill="#c9cdd1"/>
  <rect x="608" y="452" width="8" height="96" rx="3" fill="#c9cdd1"/>`;

  const ground = `
  <rect x="0" y="680" width="${W}" height="${H - 680}" fill="#c9c7c2"/>
  ${Array.from({ length: 16 }, (_, i) => `<line x1="${i * 80}" y1="680" x2="${i * 80 - 40}" y2="${H}" stroke="#b5b2ac" stroke-width="2"/>`).join("")}
  <rect x="0" y="776" width="${W}" height="24" fill="#a9a6a0"/>
  ${STEPS.map((s) => `<rect x="${s.x}" y="${s.tread}" width="${s.w}" height="8" fill="#e4e1db"/><rect x="${s.x}" y="${s.riser}" width="${s.w}" height="14" fill="#b9b5ae"/>`).join("")}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs}
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <rect x="0" y="30" width="${W}" height="660" fill="${facade.upper}"/>
  ${upper}
  <rect x="0" y="146" width="${W}" height="12" fill="${facade.trim}"/>
  <rect x="0" y="158" width="${W}" height="530" fill="${facade.wall}"/>
  ${fascia(look, shop, sign)}
  <rect x="50" y="290" width="1100" height="8" fill="#000" opacity="0.15"/>
  <rect x="50" y="300" width="1100" height="385" fill="${facade.trim}"/>
  ${pillars}
  <rect x="150" y="644" width="330" height="36" fill="${facade.wall}"/>
  <rect x="720" y="644" width="330" height="36" fill="${facade.wall}"/>
  ${windows}
  ${door}
  ${ground}
  ${posters}
  ${layout.strips.map((s) => strip(s.brand, s.slot)).join("")}
  ${layout.badges.map((b) => badge(b.brand, b.index)).join("")}
  ${layout.pushPull ? pushPull(layout.pushPull) : ""}
</svg>`;
}

async function render(file, svg) {
  const info = await sharp(Buffer.from(svg)).jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(OUT, file));
  console.log(`${file}  ${Math.round(info.size / 1024)} KB`);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const shop of DEMO_SHOPS) {
  for (const [i, audit] of shop.audits.entries()) await render(auditPhoto(shop, i), drawShopFront(shop, audit));
}
for (const sample of DEMO_SAMPLES) await render(samplePhoto(sample), drawShopFront(sample, sample));
