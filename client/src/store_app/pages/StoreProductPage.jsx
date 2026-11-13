import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import StoreHeader from "../StoreHeader";
import ZoomableImage from "../../components/ZoomableImage";
import { formatInr, storeApi, storeMediaUrl } from "../storeApi";
import { loadCart, saveCart } from "../cartStorage";
import { useStoreCustomer } from "../StoreCustomerContext";
import { storePath } from "../urls";

function galleryFromProduct(product) {
  if (!product) return [];
  const raw =
    product.images?.length > 0
      ? product.images
      : product.coverImage
        ? [{ thumb: product.coverImage, card: product.coverImage, main: product.coverImage, large: product.coverImage }]
        : [];
  return raw
    .map((img) => ({
      thumb: img.thumb || img.card || img.main || img.large,
      main: img.main || img.large || img.card || img.thumb,
      large: img.large || img.main || img.card || img.thumb,
    }))
    .filter((img) => img.main);
}

export default function StoreProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { customer } = useStoreCustomer();
  const [product, setProduct] = useState(null);
  const [sizeId, setSizeId] = useState("");
  const [qty, setQty] = useState(1);
  const [mainIdx, setMainIdx] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMainIdx(0);
    setProduct(null);
    storeApi(`/api/store/products/by-slug/${encodeURIComponent(slug)}`)
      .then((d) => {
        setProduct(d.product);
        setMainIdx(0);
      })
      .catch((e) => setMessage(e.message));
  }, [slug]);

  const images = useMemo(() => galleryFromProduct(product), [product]);
  const active = images[mainIdx] || images[0];

  function addToCart() {
    if (!customer) {
      navigate(storePath("/signin"), { state: { from: storePath(`/product/${slug}`) } });
      return;
    }
    if (!product || !sizeId) {
      setMessage("Choose a size first.");
      return;
    }
    const size = product.sizes.find((s) => s.id === sizeId);
    const cart = loadCart();
    const key = `${product.id}:${sizeId}`;
    const existing = cart.items.find((i) => i.key === key);
    const cover = images[0]?.main || product.coverImage;
    if (existing) existing.quantity += qty;
    else {
      cart.items.push({
        key,
        productId: product.id,
        sizeId,
        slug: product.slug,
        name: product.name,
        productCode: product.productCode,
        sizeCode: size.sizeCode,
        sizeLabel: size.sizeLabel,
        pricePaise: product.pricePaise,
        image: cover,
        quantity: qty,
      });
    }
    saveCart(cart);
    setMessage("Added to cart.");
  }

  if (!product) {
    return (
      <div className="min-h-[100dvh] bg-ink">
        <StoreHeader />
        <p className="px-4 py-16 text-center text-[color:var(--text-muted)]">{message || "Loading…"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-ink text-[color:var(--text)]">
      <StoreHeader />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          {active ? (
            <ZoomableImage
              key={`${product.id}-${mainIdx}`}
              src={storeMediaUrl(active.large || active.main)}
              alt={product.name}
              portraitCrop={false}
              buttonClassName="w-full overflow-hidden rounded-xl border border-[color:var(--border)] bg-white p-4"
              className="mx-auto max-h-[min(28rem,70vh)] w-full object-contain"
            />
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-xl border border-[color:var(--border)] bg-white text-sm text-[color:var(--text-muted)]">
              No image
            </div>
          )}
          {images.length > 1 ? (
            <div>
              <p className="mb-2 text-xs text-[color:var(--text-muted)]">
                {mainIdx + 1} of {images.length} — tap a photo to view
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setMainIdx(i)}
                    aria-label={`View image ${i + 1}`}
                    aria-current={i === mainIdx ? "true" : undefined}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-white ${
                      i === mainIdx ? "border-accent" : "border-[color:var(--border)]"
                    }`}
                  >
                    <img
                      src={storeMediaUrl(img.thumb || img.main)}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[color:var(--text-muted)]">{product.productCode}</p>
          <h1 className="font-display text-3xl text-[color:var(--title)]">{product.name}</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            {product.brand?.name} · {product.category?.name}
          </p>
          <p className="mt-4 text-2xl font-semibold text-accent">{formatInr(product.pricePaise)}</p>
          <p className="mt-4 text-sm leading-relaxed text-[color:var(--text)]">{product.description}</p>
          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Size</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={!s.inStock}
                onClick={() => setSizeId(s.id)}
                className={`min-w-[3rem] rounded-lg border px-3 py-2 text-sm ${
                  !s.inStock
                    ? "cursor-not-allowed opacity-40"
                    : sizeId === s.id
                      ? "border-accent text-accent"
                      : "border-[color:var(--border)]"
                }`}
              >
                {s.sizeLabel}
              </button>
            ))}
          </div>
          {sizeId ? (
            <p className="mt-2 text-xs text-[color:var(--text-muted)]">
              Size code: {product.sizes.find((s) => s.id === sizeId)?.sizeCode}
            </p>
          ) : null}
          <div className="mt-4 flex items-center gap-3">
            <label className="text-sm">
              Qty{" "}
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                className="ml-2 w-16 rounded border border-[color:var(--border)] bg-ink-card px-2 py-1"
              />
            </label>
            <button type="button" className="btn-primary" onClick={addToCart}>
              Add to cart
            </button>
          </div>
          {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}
          <Link to="/cart" className="mt-4 inline-block text-sm text-accent">
            View cart →
          </Link>
        </div>
      </div>
    </div>
  );
}
