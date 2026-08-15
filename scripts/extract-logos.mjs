import fs from "fs";
import path from "path";
import { pdf } from "pdf-to-img";

const downloads = "C:\\Users\\santh\\Downloads";
const outFranchises = path.join(process.cwd(), "public", "franchises");
const outBrand = path.join(process.cwd(), "public", "brand");

fs.mkdirSync(outFranchises, { recursive: true });
fs.mkdirSync(outBrand, { recursive: true });

const map = [
  { file: "Arizona Avengers.pdf", out: "arizona-avengers.png", dest: outFranchises },
  { file: "California Chargers.pdf", out: "california-chargers.png", dest: outFranchises },
  { file: "Carolina Crushers.pdf", out: "carolina-crushers.png", dest: outFranchises },
  { file: "Florida Falcons.pdf", out: "florida-falcons.png", dest: outFranchises },
  { file: "New Jersery Jaguars.pdf", out: "new-jersey-jaguars.png", dest: outFranchises },
  { file: "New York Knight.pdf", out: "new-york-knights.png", dest: outFranchises },
  { file: "Texas Thunder.pdf", out: "texas-thunder.png", dest: outFranchises },
  { file: "Virginia Vikings.pdf", out: "virginia-vikings.png", dest: outFranchises },
  { file: "WES Logo.pdf", out: "wesley-elite-sports.png", dest: outBrand },
  { file: "logo options .pdf", out: "uscl-logo-options.png", dest: outBrand },
];

async function convertOne(item) {
  const src = path.join(downloads, item.file);
  if (!fs.existsSync(src)) {
    console.error("MISSING", item.file);
    return;
  }
  console.log("Converting", item.file);
  const doc = await pdf(src, { scale: 2.5 });
  let pageNo = 0;
  for await (const image of doc) {
    pageNo += 1;
    const name =
      pageNo === 1 ? item.out : item.out.replace(".png", `-p${pageNo}.png`);
    const target = path.join(item.dest, name);
    fs.writeFileSync(target, image);
    console.log("  wrote", target, image.length);
    // For franchise PDFs we usually only need page 1
    if (item.dest === outFranchises) break;
    // logo options may have multiple pages - keep first 6
    if (pageNo >= 6) break;
  }
}

for (const item of map) {
  try {
    await convertOne(item);
  } catch (err) {
    console.error("FAILED", item.file, err?.message || err);
  }
}

console.log("DONE");
