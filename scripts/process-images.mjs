// Converts generated studio PNGs into optimized square WebP gallery variants.
import sharp from "sharp";
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";

const SRC = process.argv[2] ?? "../nova-img";
const OUT = "public/products";
const CAT = { smartphones: "phone-nothing", laptops: "laptop-mac", tablets: "tablet-ipad", audio: "hp-sony", wearables: "watch-ultra", gaming: "controller", "desk-setup": "kb-mech", "smart-home": "smart-speaker" };

for (const f of readdirSync(SRC).filter((f) => f.endsWith(".png"))) {
  const key = f.replace(/\.png$/, "");
  if (existsSync(path.join(OUT, `${key}-3.webp`)) && !process.env.FORCE) continue;
  const img = sharp(path.join(SRC, f));
  const { width, height } = await img.metadata();
  const side = Math.min(width, height);
  const left = Math.floor((width - side) / 2);
  const top = Math.floor((height - side) / 2);
  const base = await sharp(path.join(SRC, f)).extract({ left, top, width: side, height: side }).toBuffer();
  await sharp(base).resize(1000, 1000).webp({ quality: 82 }).toFile(path.join(OUT, `${key}-1.webp`));
  const z = Math.floor(side / 1.55);
  await sharp(base).extract({ left: Math.floor((side - z) / 2), top: Math.floor((side - z) / 2.4), width: z, height: z }).resize(1000, 1000).webp({ quality: 82 }).toFile(path.join(OUT, `${key}-2.webp`));
  const z3 = Math.floor(side / 1.2);
  await sharp(base).extract({ left: side - z3, top: Math.floor((side - z3) / 2), width: z3, height: z3 }).flop().resize(1000, 1000).webp({ quality: 82 }).toFile(path.join(OUT, `${key}-3.webp`));
  console.log("processed", key);
}
for (const [cat, key] of Object.entries(CAT)) {
  const src = path.join(SRC, `${key}.png`);
  if (!existsSync(src) || (existsSync(`public/categories/${cat}.webp`) && !process.env.FORCE)) continue;
  const m = await sharp(src).metadata();
  const side = Math.min(m.width, m.height);
  await sharp(src).extract({ left: Math.floor((m.width - side) / 2), top: Math.floor((m.height - side) / 2), width: side, height: side }).resize(640, 640).webp({ quality: 80 }).toFile(`public/categories/${cat}.webp`);
  console.log("category", cat);
}
