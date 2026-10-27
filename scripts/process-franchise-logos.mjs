import fs from "fs";
import path from "path";
import sharp from "sharp";

const dir = path.join(process.cwd(), "client", "public", "franchises");
const CANVAS = 1024;

const knightsAsset =
  "C:\\Users\\admin\\.cursor\\projects\\c-Users-admin-projects-uscl-website\\assets\\c__Users_admin_AppData_Roaming_Cursor_User_workspaceStorage_f271bde0d2543c35e3999c9829d9dc89_images_image-1983ac22-1a62-4984-adac-3d969be6ee91.png";

const texasAsset =
  "C:\\Users\\admin\\.cursor\\projects\\c-Users-admin-projects-uscl-website\\assets\\c__Users_admin_AppData_Roaming_Cursor_User_workspaceStorage_f271bde0d2543c35e3999c9829d9dc89_images_image-bc75d807-c137-4b19-9422-4f4ac744e118.jpg";

const lionsAsset =
  process.env.LIONS_LOGO_SOURCE ||
  path.join(process.cwd(), "scripts", ".work", "atlanta-lions-from-pdf.png");

function isWhitePixel(r, g, b, a = 255) {
  if (a < 12) return true;
  return r >= 242 && g >= 242 && b >= 242;
}

function isOuterBlackPixel(r, g, b) {
  return r <= 42 && g <= 42 && b <= 42;
}

function rowColMostlyBackground(data, width, height, channels, isBg, fixed, index) {
  let bg = 0;
  const total = fixed === "row" ? width : height;
  for (let i = 0; i < total; i++) {
    const x = fixed === "row" ? i : index;
    const y = fixed === "row" ? index : i;
    const p = (y * width + x) * channels;
    const a = channels === 4 ? data[p + 3] : 255;
    if (isBg(data[p], data[p + 1], data[p + 2], a)) bg++;
  }
  return bg / total >= 0.96;
}

async function tightenCrop(pngBuffer, isBg) {
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let top = 0;
  let bottom = info.height - 1;
  let left = 0;
  let right = info.width - 1;

  while (top < bottom && rowColMostlyBackground(data, info.width, info.height, info.channels, isBg, "row", top)) {
    top++;
  }
  while (bottom > top && rowColMostlyBackground(data, info.width, info.height, info.channels, isBg, "row", bottom)) {
    bottom--;
  }
  while (left < right && rowColMostlyBackground(data, info.width, info.height, info.channels, isBg, "col", left)) {
    left++;
  }
  while (right > left && rowColMostlyBackground(data, info.width, info.height, info.channels, isBg, "col", right)) {
    right--;
  }

  const width = right - left + 1;
  const height = bottom - top + 1;
  if (width < 1 || height < 1) return pngBuffer;
  return sharp(pngBuffer).extract({ left, top, width, height }).png().toBuffer();
}

function contentBoundsFromFn(data, width, height, channels, isBg) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = channels === 4 ? data[i + 3] : 255;
      if (!isBg(r, g, b, a)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (minX > maxX) return null;
  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function expandBounds(bounds, imgW, imgH, { padX = 0.03, padTop = 0.03, padBottom = 0.08 } = {}) {
  const px = Math.round(bounds.width * padX);
  const pt = Math.round(bounds.height * padTop);
  const pb = Math.round(bounds.height * padBottom);
  const left = Math.max(0, bounds.left - px);
  const top = Math.max(0, bounds.top - pt);
  const right = Math.min(imgW, bounds.left + bounds.width + px);
  const bottom = Math.min(imgH, bounds.top + bounds.height + pb);
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

/** Texas shield ink (skip outer matte black + white). */
function isTexasInk(r, g, b, a = 255) {
  if (a < 12) return false;
  if (isWhitePixel(r, g, b, a)) return false;
  if (r <= 32 && g <= 32 && b <= 32) return false;
  return true;
}

async function compositeOnWhiteCanvas(croppedPng, outputPath, format, fill) {
  const meta = await sharp(croppedPng).metadata();
  const maxSide = Math.max(meta.width, meta.height);
  const targetSide = Math.round(CANVAS * fill);
  const scale = targetSide / maxSide;
  const newW = Math.round(meta.width * scale);
  const newH = Math.round(meta.height * scale);
  const resized = await sharp(croppedPng).resize(newW, newH, { fit: "inside" }).png().toBuffer();

  const left = Math.round((CANVAS - newW) / 2);
  const top = Math.round((CANVAS - newH) / 2);
  const tmp = `${outputPath}.work`;

  const base = sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  }).composite([{ input: resized, left, top }]);

  if (format === "jpeg") {
    await base.jpeg({ quality: 94, mozjpeg: true }).toFile(tmp);
  } else {
    await base.png({ compressionLevel: 9 }).toFile(tmp);
  }
  fs.renameSync(tmp, outputPath);
}

function isKnightsBackground(r, g, b, a = 255) {
  return isWhitePixel(r, g, b, a) || isOuterBlackPixel(r, g, b);
}

/** Ignore white/grey/black matte — bounds only on real logo ink. */
function isLogoInk(r, g, b, a = 255) {
  if (a < 12) return false;
  if (isWhitePixel(r, g, b, a)) return false;
  if (r <= 80 && g <= 80 && b <= 80) return false;
  return true;
}

/** Lions PDF: full crest incl. white “LIONS” on black (not only yellow ink). */
async function normalizeLionsFromPdfOnWhite(inputPath, outputPath, fill = 0.56) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const isPageBg = (r, g, b, a) => isWhitePixel(r, g, b, a);
  let bounds = contentBoundsFromFn(data, info.width, info.height, info.channels, isPageBg);
  if (!bounds) throw new Error(`No logo content in ${inputPath}`);
  bounds = expandBounds(bounds, info.width, info.height, {
    padX: 0.04,
    padTop: 0.04,
    padBottom: 0.1,
  });
  let cropped = await sharp(inputPath).extract(bounds).png().toBuffer();
  cropped = await tightenCrop(cropped, (r, g, b, a) => !isPageBg(r, g, b, a));
  const meta = await sharp(cropped).metadata();
  const pad = Math.round(Math.max(meta.width, meta.height) * 0.05);
  cropped = await sharp(cropped)
    .extend({
      top: pad,
      bottom: Math.round(pad * 1.75),
      left: pad,
      right: pad,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();
  await compositeOnWhiteCanvas(cropped, outputPath, "png", fill);
  const m = await sharp(outputPath).metadata();
  console.log(path.basename(outputPath), `${m.width}x${m.height}`, `fill=${fill}`, "(lions pdf)");
}

async function normalizeColoredOnWhite(inputPath, outputPath, format, fill) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bounds = contentBoundsFromFn(data, info.width, info.height, info.channels, (r, g, b, a) =>
    !isLogoInk(r, g, b, a)
  );
  if (!bounds) throw new Error(`No logo content in ${inputPath}`);
  let cropped = await sharp(inputPath).extract(bounds).png().toBuffer();
  cropped = await tightenCrop(cropped, (r, g, b, a) => !isLogoInk(r, g, b, a));
  await compositeOnWhiteCanvas(cropped, outputPath, format, fill);
  const m = await sharp(outputPath).metadata();
  console.log(path.basename(outputPath), `${m.width}x${m.height}`, `fill=${fill}`, "(full color)");
}

async function normalizeTexasOnWhite(inputPath, outputPath, fill) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bounds = contentBoundsFromFn(data, info.width, info.height, info.channels, (r, g, b, a) =>
    !isTexasInk(r, g, b, a)
  );
  if (!bounds) throw new Error(`No logo content in ${inputPath}`);
  let cropped = await sharp(inputPath).extract(bounds).png().toBuffer();
  cropped = await tightenCrop(cropped, (r, g, b, a) => !isTexasInk(r, g, b, a));
  await compositeOnWhiteCanvas(cropped, outputPath, "png", fill);
  const m = await sharp(outputPath).metadata();
  console.log(path.basename(outputPath), `${m.width}x${m.height}`, `fill=${fill}`, "(texas)");
}

/** Crest on #000 matte — keep white banner + all non-matte pixels in bounds. */
function isPureBlackMatte(r, g, b, a = 255) {
  if (a < 12) return true;
  return r <= 10 && g <= 10 && b <= 10;
}

async function compositeOnTransparentCanvas(croppedPng, outputPath, fill) {
  const meta = await sharp(croppedPng).metadata();
  const maxSide = Math.max(meta.width, meta.height);
  const targetSide = Math.round(CANVAS * fill);
  const scale = targetSide / maxSide;
  const newW = Math.round(meta.width * scale);
  const newH = Math.round(meta.height * scale);
  const resized = await sharp(croppedPng).resize(newW, newH, { fit: "inside" }).png().toBuffer();

  const left = Math.round((CANVAS - newW) / 2);
  const top = Math.round((CANVAS - newH) / 2);
  const tmp = `${outputPath}.work`;

  await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left, top }])
    .png({ compressionLevel: 9 })
    .toFile(tmp);
  fs.renameSync(tmp, outputPath);
}

async function knockOutPureBlackMatte(pngBuffer) {
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isPureBlackMatte(r, g, b, data[i + 3])) {
      data[i + 3] = 0;
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function normalizeBlackMatteOnTransparent(inputPath, outputPath, fill) {
  const isBg = (r, g, b, a) => isPureBlackMatte(r, g, b, a);
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bounds = contentBoundsFromFn(data, info.width, info.height, info.channels, (r, g, b, a) =>
    !isBg(r, g, b, a)
  );
  if (!bounds) throw new Error(`No logo content in ${inputPath}`);
  let cropped = await sharp(inputPath).extract(bounds).png().toBuffer();
  cropped = await tightenCrop(cropped, (r, g, b, a) => !isBg(r, g, b, a));
  cropped = await knockOutPureBlackMatte(cropped);
  await compositeOnTransparentCanvas(cropped, outputPath, fill);
  const m = await sharp(outputPath).metadata();
  console.log(path.basename(outputPath), `${m.width}x${m.height}`, `fill=${fill}`, "(transparent)");
}

/** Same canvas treatment as Texas — white 1024 tile, crest incl. black shield on matte. */
async function normalizeBlackMatteOnWhite(inputPath, outputPath, fill) {
  const isBg = (r, g, b, a) => isPureBlackMatte(r, g, b, a);
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bounds = contentBoundsFromFn(data, info.width, info.height, info.channels, (r, g, b, a) =>
    !isBg(r, g, b, a)
  );
  if (!bounds) throw new Error(`No logo content in ${inputPath}`);
  let cropped = await sharp(inputPath).extract(bounds).png().toBuffer();
  cropped = await tightenCrop(cropped, (r, g, b, a) => !isBg(r, g, b, a));
  await compositeOnWhiteCanvas(cropped, outputPath, "png", fill);
  const m = await sharp(outputPath).metadata();
  console.log(path.basename(outputPath), `${m.width}x${m.height}`, `fill=${fill}`, "(black matte on white)");
}

const knightsOut = path.join(dir, "new-york-knights.png");
const knightsIn = fs.existsSync(knightsAsset) ? knightsAsset : knightsOut;
await normalizeColoredOnWhite(knightsIn, knightsOut, "png", 0.68);

const texasOut = path.join(dir, "texas-thunder.png");
const texasIn = fs.existsSync(texasAsset) ? texasAsset : texasOut;
await normalizeTexasOnWhite(texasIn, texasOut, 0.64);
try {
  fs.unlinkSync(path.join(dir, "texas-thunder.jpg"));
} catch {
  // ignore
}

const lionsOut = path.join(dir, "norwin-atlanta-lions.png");
const lionsIn = fs.existsSync(lionsAsset) ? lionsAsset : lionsOut;
async function normalizeLionsOnWhite(inputPath, outputPath) {
  const attempts = [
    () => normalizeLionsFromPdfOnWhite(inputPath, outputPath, 0.56),
    () => normalizeBlackMatteOnWhite(inputPath, outputPath, 0.58),
    () => normalizeColoredOnWhite(inputPath, outputPath, "png", 0.58),
    () => normalizeTexasOnWhite(inputPath, outputPath, 0.58),
  ];
  let lastErr;
  for (const run of attempts) {
    try {
      await run();
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("Unable to normalize Lions logo");
}
await normalizeLionsOnWhite(lionsIn, lionsOut);

const lionsSmOut = path.join(dir, "norwin-atlanta-lions-sm.png");
await sharp(lionsOut)
  .resize(384, 384, { fit: "inside", background: { r: 255, g: 255, b: 255 } })
  .png({ compressionLevel: 9 })
  .toFile(lionsSmOut);
console.log(path.basename(lionsSmOut), "384x384", "(lions thumb)");

const rootFranchises = path.join(process.cwd(), "public", "franchises");
fs.mkdirSync(rootFranchises, { recursive: true });
for (const name of ["norwin-atlanta-lions.png", "norwin-atlanta-lions-sm.png", "texas-thunder.png"]) {
  fs.copyFileSync(path.join(dir, name), path.join(rootFranchises, name));
}
