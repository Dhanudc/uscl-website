import { Router } from "express";
import { adminRequired } from "../../middleware/auth.js";
import { getStoreSettings } from "../../models/store/StoreSettings.js";
import { StoreBrand } from "../../models/store/StoreBrand.js";
import { StoreCategory } from "../../models/store/StoreCategory.js";
import { StoreProduct } from "../../models/store/StoreProduct.js";
import { StoreProductSize } from "../../models/store/StoreProductSize.js";
import { StoreProductImage } from "../../models/store/StoreProductImage.js";
import { StoreOrder } from "../../models/store/StoreOrder.js";
import { StoreCustomer } from "../../models/store/StoreCustomer.js";
import { StoreCoupon } from "../../models/store/StoreCoupon.js";
import {
  nextProductCode,
  rebuildProductSearchText,
  sizeCodeForProduct,
  slugify,
} from "../../utils/store/storeHelpers.js";
import {
  clearProductImageFolder,
  extFromMime,
  MAX_PRODUCT_IMAGES,
  saveProductImageFiles,
  storeProductImagesUpload,
} from "../../utils/store/storeUpload.js";
import { formatProductDetail, loadProductBundle } from "../../utils/store/storeCatalog.js";
import { inrToPaise } from "../../utils/store/storePricing.js";

const router = Router();
router.use((req, res, next) => {
  req.headers["x-uscl-portal"] = "admin";
  next();
});
router.use(adminRequired);

router.get("/settings", async (_req, res) => {
  const settings = await getStoreSettings();
  res.json({ settings });
});

router.patch("/settings", async (req, res) => {
  const settings = await getStoreSettings();
  const body = req.body || {};
  const allowed = [
    "enabled",
    "deliveryFeePaise",
    "freeDeliveryThresholdPaise",
    "freeDeliveryAfterDiscount",
    "paymentModes",
    "gstRegisteredState",
    "businessLegalName",
    "gstin",
    "registeredAddress",
    "billType",
    "pricesIncludeGst",
    "policies",
    "lowStockThreshold",
  ];
  for (const key of allowed) {
    if (body[key] !== undefined) settings[key] = body[key];
  }
  await settings.save();
  res.json({ settings });
});

router.get("/brands", async (_req, res) => {
  const brands = await StoreBrand.find().sort({ name: 1 });
  res.json({ brands });
});

router.post("/brands", async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Brand name required." });
  const slug = slugify(name);
  const brand = await StoreBrand.create({ name, slug, active: true });
  res.json({ brand });
});

router.patch("/brands/:id", async (req, res) => {
  const brand = await StoreBrand.findById(req.params.id);
  if (!brand) return res.status(404).json({ error: "Brand not found." });
  if (req.body.name) {
    brand.name = String(req.body.name).trim();
    brand.slug = slugify(brand.name);
  }
  if (req.body.active != null) brand.active = Boolean(req.body.active);
  await brand.save();
  res.json({ brand });
});

router.get("/categories", async (_req, res) => {
  const categories = await StoreCategory.find().sort({ displayOrder: 1 });
  res.json({ categories });
});

router.get("/products", async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.brandId) filter.brandId = req.query.brandId;
  if (req.query.categoryId) filter.categoryId = req.query.categoryId;
  const q = String(req.query.q || "").trim();
  if (q.length >= 2) {
    filter.$or = [
      { productCode: new RegExp(q, "i") },
      { name: new RegExp(q, "i") },
      { searchText: new RegExp(q, "i") },
    ];
  }
  const products = await StoreProduct.find(filter).sort({ updatedAt: -1 }).limit(200);
  const out = [];
  for (const p of products) {
    const bundle = await loadProductBundle(p._id);
    out.push(formatProductDetail(bundle));
  }
  res.json({ products: out });
});

router.get("/products/:id", async (req, res) => {
  const bundle = await loadProductBundle(req.params.id);
  if (!bundle) return res.status(404).json({ error: "Not found." });
  res.json({ product: formatProductDetail(bundle) });
});

router.post("/products", async (req, res) => {
  try {
    const settings = await getStoreSettings();
    const name = String(req.body.name || "").trim();
    const categoryId = req.body.categoryId;
    const brandId = req.body.brandId;
    const pricePaise = inrToPaise(req.body.priceInr ?? req.body.pricePaise / 100);
    if (!name || !categoryId || !brandId) {
      return res.status(400).json({ error: "Name, team category and brand are required." });
    }
    const productCode = await nextProductCode(settings);
    let slug = slugify(name);
    const slugTaken = await StoreProduct.findOne({ slug });
    if (slugTaken) slug = `${slug}-${productCode.toLowerCase()}`;

    const product = await StoreProduct.create({
      productCode,
      categoryId,
      brandId,
      name,
      slug,
      description: String(req.body.description || ""),
      pricePaise,
      mrpPaise: req.body.mrpInr != null ? inrToPaise(req.body.mrpInr) : null,
      priceIncludesGst: req.body.priceIncludesGst !== false,
      hsnCode: String(req.body.hsnCode || ""),
      gstRateBps: Number(req.body.gstRateBps) || 1200,
      status: req.body.status === "active" ? "active" : "draft",
    });

    const sizeRows = Array.isArray(req.body.sizes) ? req.body.sizes : [];
    const sizes = [];
    for (const row of sizeRows) {
      const sizeLabel = String(row.sizeLabel || row.label || "").trim().toUpperCase();
      const stockQty = Math.max(0, Number(row.stockQty ?? row.qty) || 0);
      if (!sizeLabel) continue;
      sizes.push(
        await StoreProductSize.create({
          productId: product._id,
          sizeLabel,
          sizeCode: sizeCodeForProduct(productCode, sizeLabel),
          stockQty,
          active: true,
        })
      );
    }

    const brand = await StoreBrand.findById(brandId);
    const category = await StoreCategory.findById(categoryId);
    await rebuildProductSearchText(product, { brand, category, sizes });
    await product.save();

    res.json({ product: formatProductDetail(await loadProductBundle(product._id)) });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not create product." });
  }
});

router.patch("/products/:id", async (req, res) => {
  const product = await StoreProduct.findById(req.params.id);
  if (!product) return res.status(404).json({ error: "Not found." });
  const body = req.body || {};
  if (body.name) {
    product.name = String(body.name).trim();
    product.slug = slugify(product.name);
  }
  if (body.description != null) product.description = String(body.description);
  if (body.priceInr != null) product.pricePaise = inrToPaise(body.priceInr);
  if (body.status) product.status = body.status;
  if (body.categoryId) product.categoryId = body.categoryId;
  if (body.brandId) product.brandId = body.brandId;
  await product.save();
  const bundle = await loadProductBundle(product._id);
  await rebuildProductSearchText(product, {
    brand: bundle.brand,
    category: bundle.category,
    sizes: bundle.sizes,
  });
  await product.save();
  res.json({ product: formatProductDetail(bundle) });
});

router.patch("/products/:id/sizes/:sizeId/stock", async (req, res) => {
  const size = await StoreProductSize.findOne({ _id: req.params.sizeId, productId: req.params.id });
  if (!size) return res.status(404).json({ error: "Size not found." });
  size.stockQty = Math.max(0, Number(req.body.stockQty));
  await size.save();
  res.json({ size });
});

router.post("/products/:id/images", storeProductImagesUpload, async (req, res) => {
  try {
    const product = await StoreProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found." });
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: "Upload at least one image." });

    const replace =
      req.query.replace === "true" ||
      req.body?.replace === true ||
      req.body?.replace === "true";
    const existingCount = await StoreProductImage.countDocuments({ productId: product._id });
    if (replace) {
      await StoreProductImage.deleteMany({ productId: product._id });
      clearProductImageFolder(String(product._id), product.slug);
    } else if (existingCount + files.length > MAX_PRODUCT_IMAGES) {
      return res.status(400).json({
        error: `This product can have at most ${MAX_PRODUCT_IMAGES} images (${existingCount} already). Check “Replace all” to start over.`,
      });
    }

    const startOrder = replace ? 0 : existingCount;
    const buffers = files.map((f) => ({ buffer: f.buffer, ext: extFromMime(f.mimetype) }));
    const paths = await saveProductImageFiles(product._id, product.slug, buffers);
    const docs = [];
    for (let i = 0; i < paths.length; i++) {
      docs.push(
        await StoreProductImage.create({
          productId: product._id,
          sortOrder: startOrder + i,
          paths: paths[i],
        })
      );
    }
    const bundle = await loadProductBundle(product._id);
    res.json({ images: docs, product: formatProductDetail(bundle) });
  } catch (err) {
    res.status(400).json({ error: err.message || "Upload failed." });
  }
});

router.get("/orders", async (_req, res) => {
  const orders = await StoreOrder.find().sort({ createdAt: -1 }).limit(200);
  res.json({ orders });
});

router.patch("/orders/:id/status", async (req, res) => {
  const order = await StoreOrder.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found." });
  const status = String(req.body.orderStatus || "").trim();
  if (status) {
    order.orderStatus = status;
    order.statusHistory.push({ status, note: String(req.body.note || "") });
  }
  if (req.body.paymentStatus) order.paymentStatus = req.body.paymentStatus;
  await order.save();
  res.json({ order });
});

router.get("/customers", async (_req, res) => {
  const customers = await StoreCustomer.find().sort({ createdAt: -1 }).limit(200);
  res.json({ customers });
});

router.get("/coupons", async (_req, res) => {
  const coupons = await StoreCoupon.find().sort({ createdAt: -1 });
  res.json({ coupons });
});

router.post("/coupons", async (req, res) => {
  const code = String(req.body.code || "").trim().toUpperCase();
  if (!code) return res.status(400).json({ error: "Coupon code required." });
  const coupon = await StoreCoupon.create({
    code,
    name: String(req.body.name || code),
    type: req.body.type === "percent" ? "percent" : "fixed",
    value: req.body.type === "percent" ? Number(req.body.value) || 0 : inrToPaise(req.body.valueInr ?? req.body.value),
    maxDiscountPaise: req.body.maxDiscountInr != null ? inrToPaise(req.body.maxDiscountInr) : null,
    minOrderPaise: req.body.minOrderInr != null ? inrToPaise(req.body.minOrderInr) : 0,
    active: true,
  });
  res.json({ coupon });
});

export default router;
