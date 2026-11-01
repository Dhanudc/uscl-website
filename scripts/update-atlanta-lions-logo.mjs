/**
 * Build norwin-atlanta-lions.png from Norwin crest JPG/PNG (preferred) or legacy PDF.
 * Usage: node scripts/update-atlanta-lions-logo.mjs [path-to.jpg|.png|.pdf]
 */
import fs from "fs";
import path from "path";
import { pdf } from "pdf-to-img";
import { spawnSync } from "child_process";

const repoRoot = process.cwd();
const sourceDir = path.join(repoRoot, "scripts", "source");

const RASTER_CANDIDATES = [
  process.argv[2],
  path.join(sourceDir, "norwin-atlanta-lions.jpg"),
  path.join(sourceDir, "norwin-atlanta-lions.png"),
  path.join(sourceDir, "norwin-atlanta-lions.jpeg"),
  path.join(sourceDir, "atlanta-lions.jpg"),
  path.join(sourceDir, "atlanta-lions.png"),
].filter(Boolean);

const rasterPath = RASTER_CANDIDATES.find((p) => p && fs.existsSync(p));
if (rasterPath) {
  fs.mkdirSync(sourceDir, { recursive: true });
  const canonical = path.join(sourceDir, "norwin-atlanta-lions.jpg");
  if (path.resolve(rasterPath) !== path.resolve(canonical)) {
    fs.copyFileSync(rasterPath, canonical);
  }
  console.log("Source image:", rasterPath);
  const proc = spawnSync(process.execPath, ["scripts/process-franchise-logos.mjs"], {
    cwd: repoRoot,
    env: { ...process.env, LIONS_LOGO_SOURCE: canonical },
    stdio: "inherit",
  });
  process.exit(proc.status ?? 1);
}

const defaultCandidates = [
  "C:\\Users\\admin\\Downloads\\Norwin Atlanta Lions.pdf",
].filter(Boolean);

const pdfPath = defaultCandidates.find((p) => p && fs.existsSync(p));
if (!pdfPath) {
  console.error(
    "Norwin Atlanta Lions logo not found. Add scripts/source/norwin-atlanta-lions.jpg (Norwin crest on white) or pass a JPG/PNG path.\nThe old atlanta-lions-final.pdf is not the Norwin crest."
  );
  process.exit(1);
}

const workDir = path.join(repoRoot, "scripts", ".work");
fs.mkdirSync(workDir, { recursive: true });
fs.mkdirSync(sourceDir, { recursive: true });

if (path.resolve(pdfPath) !== path.join(sourceDir, "atlanta-lions-final.pdf")) {
  fs.copyFileSync(pdfPath, path.join(sourceDir, "atlanta-lions-final.pdf"));
}

const rawPng = path.join(workDir, "atlanta-lions-from-pdf.png");
console.log("PDF:", pdfPath);
const doc = await pdf(pdfPath, { scale: 3 });
let wrote = false;
for await (const image of doc) {
  fs.writeFileSync(rawPng, image);
  wrote = true;
  console.log("Rasterized", rawPng, image.length, "bytes");
  break;
}
if (!wrote) {
  console.error("PDF had no pages.");
  process.exit(1);
}

const proc = spawnSync(process.execPath, ["scripts/process-franchise-logos.mjs"], {
  cwd: repoRoot,
  env: { ...process.env, LIONS_LOGO_SOURCE: rawPng },
  stdio: "inherit",
});
process.exit(proc.status ?? 1);
