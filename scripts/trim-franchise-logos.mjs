import fs from "fs";
import path from "path";
import sharp from "sharp";

const dir = path.join(process.cwd(), "client", "public", "franchises");
const targets = ["new-york-knights.png", "texas-thunder.jpg"];

for (const file of targets) {
  const input = path.join(dir, file);
  if (!fs.existsSync(input)) {
    console.warn("skip missing", file);
    continue;
  }
  const tmp = path.join(dir, `.trim-${file}`);
  const img = sharp(input);
  const meta = await img.metadata();
  await img.trim({ threshold: 12 }).toFile(tmp);
  const trimmed = await sharp(tmp).metadata();
  fs.renameSync(tmp, input);
  console.log(file, `${meta.width}x${meta.height} -> ${trimmed.width}x${trimmed.height}`);
}
