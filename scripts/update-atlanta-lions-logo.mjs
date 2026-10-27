/**
 * Import atlanta-lions-final.pdf → norwin-atlanta-lions.png (Texas-style white tile).
 * Usage: node scripts/update-atlanta-lions-logo.mjs [path-to.pdf]
 */
import fs from "fs";
import path from "path";
import { pdf } from "pdf-to-img";
import { spawnSync } from "child_process";

const repoRoot = process.cwd();
const defaultCandidates = [
  process.argv[2],
  path.join(
    repoRoot,
    "scripts",
    "source",
    "atlanta-lions-final.pdf"
  ),
  "C:\\Users\\admin\\.cursor\\projects\\c-Users-admin-projects-uscl-website\\attachments\\8e74c9e5-ce90-425a-bbe7-1bda03eb1e37\\atlanta-lions-final.pdf",
  "C:\\Users\\admin\\Downloads\\atlanta-lions-final.pdf",
].filter(Boolean);

const pdfPath = defaultCandidates.find((p) => p && fs.existsSync(p));
if (!pdfPath) {
  console.error("atlanta-lions-final.pdf not found. Pass path as first argument.");
  process.exit(1);
}

const workDir = path.join(repoRoot, "scripts", ".work");
fs.mkdirSync(workDir, { recursive: true });
const sourceDir = path.join(repoRoot, "scripts", "source");
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
