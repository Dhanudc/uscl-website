import fs from "fs";
import path from "path";
import sharp from "sharp";

const dir = path.join(process.cwd(), "client", "public", "franchises");
const CANVAS = 1024;

const knightsAsset =
  "C:\\Users\\admin\\.cursor\\projects\\c-Users-admin-projects-uscl-website\\assets\\c__Users_admin_AppData_Roaming_Cursor_User_workspaceStorage_f271bde0d2543c35e3999c9829d9dc89_images_image-1983ac22-1a62-4984-adac-3d969be6ee91.png";

const texasAsset =
  "C:\\Users\\admin\\.cursor\\projects\\c-Users-admin-projects-uscl-website\\assets\\c__Users_admin_AppData_Roaming_Cursor_User_workspaceStorage_f271bde0d2543c35e3999c9829d9dc89_images_image-bc75d807-c137-4b19-9422-4f4ac744e118.jpg";

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
