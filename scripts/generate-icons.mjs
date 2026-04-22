#!/usr/bin/env node
// scripts/generate-icons.mjs
// Generates all PWA icon PNGs from public/icons/icon.svg
// Run: node scripts/generate-icons.mjs
// Requires: npm install -D sharp

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ICONS_DIR = join(ROOT, "public", "icons");
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function run() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.log("sharp not installed. Run: npm install -D sharp");
    console.log("Then re-run: node scripts/generate-icons.mjs");
    process.exit(0);
  }

  const svgPath = join(ICONS_DIR, "icon.svg");
  if (!existsSync(svgPath)) { console.error("icon.svg not found"); process.exit(1); }

  const svgBuffer = readFileSync(svgPath);

  for (const size of SIZES) {
    await sharp(svgBuffer).resize(size, size).png().toFile(join(ICONS_DIR, `icon-${size}.png`));
    console.log(`icon-${size}.png`);
  }
  for (const size of [192, 512]) {
    await sharp(svgBuffer).resize(size, size).png().toFile(join(ICONS_DIR, `icon-maskable-${size}.png`));
    console.log(`icon-maskable-${size}.png`);
  }
  console.log("All icons generated in public/icons/");
}

run().catch(console.error);
