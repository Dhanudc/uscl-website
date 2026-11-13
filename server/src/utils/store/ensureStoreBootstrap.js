import { FRANCHISES } from "../franchises.js";
import { StoreBrand } from "../../models/store/StoreBrand.js";
import { StoreCategory } from "../../models/store/StoreCategory.js";
import { getStoreSettings } from "../../models/store/StoreSettings.js";
import { slugify } from "./storeHelpers.js";

export async function ensureStoreBootstrap() {
  await getStoreSettings();

  const general = await StoreCategory.findOne({ isGeneral: true });
  if (!general) {
    await StoreCategory.create({
      teamId: null,
      name: "General",
      slug: "general",
      displayOrder: 999,
      isGeneral: true,
      active: true,
    });
  }

  let order = 0;
  for (const team of FRANCHISES) {
    const slug = slugify(team.id || team.city);
    const existing = await StoreCategory.findOne({ teamId: team.id });
    if (existing) continue;
    await StoreCategory.create({
      teamId: team.id,
      name: team.name.split(" ").slice(-2).join(" ") || team.name,
      slug,
      displayOrder: order++,
      active: true,
    });
  }

  const brandCount = await StoreBrand.countDocuments();
  if (brandCount === 0) {
    await StoreBrand.create([
      { name: "SG", slug: "sg", active: true },
      { name: "Adidas", slug: "adidas", active: true },
    ]);
  }
}
