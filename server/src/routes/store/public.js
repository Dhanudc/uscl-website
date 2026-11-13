import { Router } from "express";
import mongoose from "mongoose";
import { getStoreSettings } from "../../models/store/StoreSettings.js";
import { StoreBrand } from "../../models/store/StoreBrand.js";
import { StoreCategory } from "../../models/store/StoreCategory.js";
import { StoreProduct } from "../../models/store/StoreProduct.js";
import { StoreProductSize } from "../../models/store/StoreProductSize.js";
import { StoreProductImage } from "../../models/store/StoreProductImage.js";
import { formatProductCard, formatProductDetail, loadProductBundle } from "../../utils/store/storeCatalog.js";
import { normalizeSearchText } from "../../utils/store/storeHelpers.js";
import { storeDummyPaymentAvailable } from "../../utils/store/storeDummyPayment.js";

const router = Router();

router.get("/meta", async (_req, res) => {
  try {
    const settings = await getStoreSettings();
    if (!settings.enabled) {
      return res.json({ enabled: false, status: "disabled" });
    }
    res.json({
      enabled: true,
      paymentModes: settings.paymentModes,
      dummyPaymentAvailable: storeDummyPaymentAvailable(),
      policies: settings.policies,
      billType: settings.billType,
      forgotPasswordHint: "Forgot your password? Please email info@usclt20.com.",
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Could not load store meta." });
  }
});

router.get("/brands", async (_req, res) => {
  const brands = await StoreBrand.find({ active: true }).sort({ name: 1 }).lean();
  res.json({
    brands: brands.map((b) => ({ id: String(b._id), name: b.name, slug: b.slug, logoPath: b.logoPath })),
  });
});

router.get("/categories", async (_req, res) => {
  const categories = await StoreCategory.find({ active: true }).sort({ displayOrder: 1 }).lean();
  res.json({
    categories: categories.map((c) => ({
      id: String(c._id),
      name: c.name,
      slug: c.slug,
      teamId: c.teamId,
      isGeneral: c.isGeneral,
    })),
  });
});

async function enrichProducts(products) {
  if (!products.length) return [];
  const ids = products.map((p) => p._id);
  const brandIds = [...new Set(products.map((p) => String(p.brandId)))];
  const catIds = [...new Set(products.map((p) => String(p.categoryId)))];
  const [brands, categories, images, sizes] = await Promise.all([
    StoreBrand.find({ _id: { $in: brandIds } }).lean(),
    StoreCategory.find({ _id: { $in: catIds } }).lean(),
    StoreProductImage.find({ productId: { $in: ids } }).sort({ sortOrder: 1 }).lean(),
    StoreProductSize.find({ productId: { $in: ids } }).lean(),
  ]);
  const brandMap = Object.fromEntries(brands.map((b) => [String(b._id), b]));
  const catMap = Object.fromEntries(categories.map((c) => [String(c._id), c]));
  const imgMap = {};
  for (const img of images) {
    const k = String(img.productId);
    if (!imgMap[k]) imgMap[k] = [];
    imgMap[k].push(img);
  }
  const sizeMap = {};
  for (const s of sizes) {
    const k = String(s.productId);
    if (!sizeMap[k]) sizeMap[k] = [];
    sizeMap[k].push(s);
  }
  return products.map((p) =>
    formatProductCard(p, {
      brand: brandMap[String(p.brandId)],
      category: catMap[String(p.categoryId)],
      images: imgMap[String(p._id)] || [],
      sizes: sizeMap[String(p._id)] || [],
    })
  );
}

router.get("/products", async (req, res) => {
  try {
    const settings = await getStoreSettings();
    if (!settings.enabled) return res.status(503).json({ error: "Store is temporarily unavailable." });

    const filter = { status: "active" };
    const teamSlugs = String(req.query.team || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const brandSlugs = String(req.query.brand || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const sizeLabels = String(req.query.size || "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const q = normalizeSearchText(req.query.q || "");
    const minPaise = req.query.min ? Number(req.query.min) : null;
    const maxPaise = req.query.max ? Number(req.query.max) : null;
    const sort = String(req.query.sort || "newest");

    if (brandSlugs.length) {
      const brands = await StoreBrand.find({ slug: { $in: brandSlugs }, active: true }).select("_id");
      filter.brandId = { $in: brands.map((b) => b._id) };
    }
    if (teamSlugs.length) {
      const cats = await StoreCategory.find({ slug: { $in: teamSlugs }, active: true }).select("_id");
      filter.categoryId = { $in: cats.map((c) => c._id) };
    }
    if (q.length >= 2) {
      filter.$text = { $search: q.replace(/-/g, " ") };
    }
    if (minPaise != null && !Number.isNaN(minPaise)) filter.pricePaise = { ...(filter.pricePaise || {}), $gte: minPaise };
    if (maxPaise != null && !Number.isNaN(maxPaise)) filter.pricePaise = { ...(filter.pricePaise || {}), $lte: maxPaise };

    let query = StoreProduct.find(filter);
    if (sort === "price_asc") query = query.sort({ pricePaise: 1 });
    else if (sort === "price_desc") query = query.sort({ pricePaise: -1 });
    else query = query.sort({ createdAt: -1 });

    let products = await query.limit(200).lean();

    if (sizeLabels.length) {
      const sizeDocs = await StoreProductSize.find({
        sizeLabel: { $in: sizeLabels },
        stockQty: { $gt: 0 },
        active: true,
      }).select("productId");
      const allowed = new Set(sizeDocs.map((s) => String(s.productId)));
      products = products.filter((p) => allowed.has(String(p._id)));
    }

    const cards = await enrichProducts(products);
    res.json({ products: cards });
  } catch (err) {
    res.status(500).json({ error: err.message || "Could not list products." });
  }
});

router.get("/products/by-slug/:slug", async (req, res) => {
  const product = await StoreProduct.findOne({ slug: req.params.slug, status: "active" });
  if (!product) return res.status(404).json({ error: "Product not found." });
  const bundle = await loadProductBundle(product._id);
  res.json({ product: formatProductDetail(bundle) });
});

router.get("/search/suggest", async (req, res) => {
  const q = normalizeSearchText(req.query.q || "");
  if (q.length < 2) return res.json({ suggestions: [] });

  const [brands, categories, products] = await Promise.all([
    StoreBrand.find({ active: true, name: new RegExp(q.split(" ")[0], "i") }).limit(5).lean(),
    StoreCategory.find({ active: true, name: new RegExp(q.split(" ")[0], "i") }).limit(5).lean(),
    StoreProduct.find({
      status: "active",
      $or: [
        { productCode: new RegExp(`^${q}`, "i") },
        { searchText: new RegExp(q.replace(/\s+/g, ".*"), "i") },
        { name: new RegExp(q, "i") },
      ],
    })
      .limit(8)
      .lean(),
  ]);

  const suggestions = [
    ...brands.map((b) => ({ type: "brand", label: b.name, slug: b.slug })),
    ...categories.map((c) => ({ type: "team", label: c.name, slug: c.slug })),
    ...(await enrichProducts(products)).map((p) => ({
      type: "product",
      label: p.name,
      slug: p.slug,
      productCode: p.productCode,
      coverImage: p.coverImage,
      pricePaise: p.pricePaise,
    })),
  ];
  res.json({ suggestions: suggestions.slice(0, 12) });
});

router.get("/sizes/options", async (_req, res) => {
  const sizes = await StoreProductSize.distinct("sizeLabel", { active: true });
  res.json({ sizes: sizes.sort() });
});

export default router;
