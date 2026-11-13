import { StoreProduct } from "../../models/store/StoreProduct.js";
import { StoreProductSize } from "../../models/store/StoreProductSize.js";
import { StoreProductImage } from "../../models/store/StoreProductImage.js";
import { StoreBrand } from "../../models/store/StoreBrand.js";
import { StoreCategory } from "../../models/store/StoreCategory.js";

function coverPathFromImages(images) {
  if (!images.length) return "";
  const first = images[0];
  return first.paths?.card || first.paths?.main || first.paths?.large || first.paths?.thumb || "";
}

export function formatProductCard(product, { brand, category, images = [], sizes = [] } = {}) {
  const cover = coverPathFromImages(images);
  const stockTotal = sizes.reduce((n, s) => n + (s.active ? s.stockQty : 0), 0);
  const availableSizes = sizes.filter((s) => s.active && s.stockQty > 0).map((s) => s.sizeLabel);
  return {
    id: String(product._id),
    productCode: product.productCode,
    name: product.name,
    slug: product.slug,
    description: product.description,
    pricePaise: product.pricePaise,
    mrpPaise: product.mrpPaise,
    priceIncludesGst: product.priceIncludesGst,
    status: product.status,
    brand: brand ? { id: String(brand._id), name: brand.name, slug: brand.slug } : null,
    category: category
      ? { id: String(category._id), name: category.name, slug: category.slug, teamId: category.teamId }
      : null,
    coverImage: cover,
    stockTotal,
    availableSizes,
    inStock: stockTotal > 0,
  };
}

export async function loadProductBundle(productId) {
  const product = await StoreProduct.findById(productId);
  if (!product) return null;
  const [brand, category, images, sizes] = await Promise.all([
    StoreBrand.findById(product.brandId),
    StoreCategory.findById(product.categoryId),
    StoreProductImage.find({ productId: product._id }).sort({ sortOrder: 1 }),
    StoreProductSize.find({ productId: product._id }).sort({ sizeLabel: 1 }),
  ]);
  return { product, brand, category, images, sizes };
}

export function formatProductDetail(bundle) {
  if (!bundle) return null;
  const { product, brand, category, images, sizes } = bundle;
  return {
    ...formatProductCard(product, { brand, category, images, sizes }),
    hsnCode: product.hsnCode,
    gstRateBps: product.gstRateBps,
    images: images
      .map((img) => ({
        id: String(img._id),
        sortOrder: img.sortOrder,
        thumb: img.paths?.thumb,
        card: img.paths?.card,
        main: img.paths?.main,
        large: img.paths?.large,
      }))
      .filter((img) => img.thumb || img.card || img.main || img.large),
    sizes: sizes.map((s) => ({
      id: String(s._id),
      sizeLabel: s.sizeLabel,
      sizeCode: s.sizeCode,
      stockQty: s.stockQty,
      active: s.active,
      inStock: s.active && s.stockQty > 0,
    })),
  };
}
